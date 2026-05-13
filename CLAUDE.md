# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server (proxies /api and /uploads to localhost:8080)

# Build
npm run build        # Type-check with tsc, then Vite production build

# Preview
npm run preview      # Preview the production build locally
```

No test runner is configured in this project.

## Architecture

**Cloud Canvas** is a React 19 + TypeScript + Vite SPA for collaborative picture/asset management.

### Key Conventions

- All components use React functional components with hooks
- No centralized state store (no Zustand/Redux) — state is managed via React Context and component-level `useState`
- Path alias `@` maps to `./src`
- TypeScript strict mode is enabled with no unused locals/parameters
- Styling: mix of Tailwind CSS classes (UI primitives) and inline styles (pages). CSS custom properties define the design tokens.

### Layer Structure

```
src/api/           # All HTTP calls — one file per domain (auth, pictures, tags, teams)
src/utils/         # Pure utilities: auth.ts (localStorage), format.ts (bytes/dates)
src/react-app/
  auth.tsx         # AuthProvider context + useAuth hook
  theme.tsx        # ThemeProvider context + useTheme hook
  toast.tsx        # ToastProvider context + useToast hook
  i18n.ts          # i18next setup (en, zh-CN)
  App.tsx          # Root component, routing, shell layout
  pages/           # Page-level components (route targets)
  components/      # Shared components (TiltedCard, CollabCanvas, editors, etc.)
  ui/shadcn/       # Reusable UI primitives (Button, Dialog, Input, Select, etc.)
  hooks/           # Custom hooks (usePictureCollabSession)
  collab/          # Yjs document helpers for real-time collaboration
src/stores/        # Minimal store (editedPictures.ts)
src/types/         # Type declarations (sockjs-client.d.ts)
```

### API Client (`src/api/client.ts`)

- Base URL from `VITE_API_BASE` env variable (falls back to empty string, using Vite proxy)
- Axios instance with 15s timeout
- Request interceptor: attaches `Authorization: Bearer {token}` from localStorage key `cpp:token`
- Response interceptor: clears auth on 401
- Standard response shape: `ApiResponse<T> { success, code, message, data }`
- Pagination shape: `PageResponse<T> { items, total, page, size }`

### Authentication

- Token stored in localStorage under `cpp:token`; user JSON under `cpp:user`
- `AuthProvider` context provides `user`, `isAuthed`, `isAdmin`, `refresh()` (hits `/api/auth/me`), `applyAuth()`, and `logout()`
- Route guards: `RequireAuth` and `RequireAdmin` wrapper components check auth state

### Dev Proxy (vite.config.ts)

```
/api      → http://localhost:8080
/uploads  → http://localhost:8080
/ws       → http://localhost:8080 (WebSocket)
```

The backend must be running on port 8080 during development.

### Notable Patterns

- **Infinite scroll**: GalleryPage uses `IntersectionObserver` on a sentinel element to load more pages
- **Admin hand-off**: AdminReviewList passes the selected picture to AdminReviewDetail via `sessionStorage`
- **CSV export**: Pictures moderation records and team member events are exportable as CSV blobs
- **Tag confidence**: Uploaded pictures receive auto-generated tags with confidence scores from the backend
- **Real-time collaboration**: Yjs + STOMP/SockJS for team picture editing with presence, cursors, and locks
- **Notifications**: STOMP-based push notifications via `/user/queue/notifications` and `/topic/admin/notifications`
- **Dark mode**: CSS custom properties toggled via `data-theme` attribute on `<html>`
- **i18n**: react-i18next with `en` and `zh-CN` translations; language persisted in `cpp:language` localStorage key
- **Error boundary**: `ErrorBoundary` component wraps routes to catch render errors gracefully
