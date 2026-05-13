# Cloud Picture Platform Web

Frontend application for the Cloud Picture Platform ecosystem.

This repo is now centered on a React + TypeScript + Vite application, with the editor and collaboration experience living in the React app under `src/react-app/`.

## Current focus

- picture gallery, search, upload, tags, teams, and admin review flows
- React-owned picture detail and picture edit pages
- collaboration session bootstrap from the backend
- live presence, lock state, cursors, selections, and shared annotation updates
- signed collaboration room bootstrap and room-token refresh for the next Yjs-compatible transport step

## Stack

- React 19
- TypeScript 5
- Vite 7
- React Router 7
- Axios
- STOMP + SockJS for the current live session path
- Radix UI primitives for shared UI building blocks

## Commands

```bash
npm run dev
npm run build
npm run preview
```

## Backend expectation

During local development the backend should be running on `http://localhost:8080`.

The Vite dev server proxies:

- `/api`
- `/uploads`

## Collaboration direction

The frontend currently consumes `/api/pictures/{id}/editor-session` as the primary editor bootstrap contract.

That payload now includes:

- persisted editor document snapshot
- presence snapshot
- legacy realtime event contract
- signed collaboration room bootstrap

The room bootstrap is intended for the next provider-backed collaboration phase, such as Yjs with `y-websocket` or Hocuspocus.

See:

- [docs/frontend-refactor-plan.md](docs/frontend-refactor-plan.md)

## Structure

```text
src/
  api/                  HTTP API wrappers
  react-app/            React application, pages, hooks, editor UI
  stores/               lightweight client-side persistence helpers
  utils/                auth and formatting utilities
  collab-types.d.ts     collaboration event typings
```

## Notes

- No test runner is currently configured in this repo.
- The collaboration UI is aligned with the backend room-bootstrap contract, but it has not yet been migrated to a full Yjs client transport.
