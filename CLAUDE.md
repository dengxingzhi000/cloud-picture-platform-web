# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server (proxies /api and /uploads to localhost:8080)

# Build
npm run build        # Type-check with vue-tsc, then Vite production build

# Preview
npm run preview      # Preview the production build locally
```

No test runner is configured in this project.

## Architecture

**Cloud Canvas** is a Vue 3 + TypeScript + Vite SPA for collaborative picture/asset management.

### Key Conventions

- All Vue components use `<script setup>` syntax
- No centralized state store (no Pinia/Vuex) — state is managed via composables and component-level `ref()`/`reactive()`
- Path alias `@` maps to `./src`
- TypeScript strict mode is enabled with no unused locals/parameters

### Layer Structure

```
src/api/        # All HTTP calls — one file per domain (auth, pictures, tags, teams)
src/composables/# Reactive shared state (useAuth for user/token)
src/utils/      # Pure utilities: auth.ts (localStorage), format.ts (bytes/dates)
src/router/     # Vue Router; guards enforce auth and admin role
src/views/      # Page-level components
src/components/ # Shared components (ProfileDialog)
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
- `useAuth()` composable provides reactive `user`, computed `isAuthed`, `refresh()` (hits `/api/auth/me`), and `logout()`
- Router guards: protected routes check `getToken()`; admin routes also check `user.role === 'ADMIN'`

### Dev Proxy (vite.config.ts)

```
/api      → http://localhost:8080
/uploads  → http://localhost:8080
```

The backend must be running on port 8080 during development.

### Notable Patterns

- **Infinite scroll**: GalleryView uses `IntersectionObserver` on a sentinel element to load more pages
- **Admin hand-off**: AdminReviewList passes the selected picture to AdminReviewDetail via `sessionStorage`
- **Avatar cropping**: ProfileDialog uses the canvas API for client-side image cropping
- **CSV export**: Pictures moderation records and team member events are exportable as CSV blobs
- **Tag confidence**: Uploaded pictures receive auto-generated tags with confidence scores from the backend
