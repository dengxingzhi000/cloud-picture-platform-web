<div align="center">

# Cloud Picture Platform Web

### React frontend for CloudPicturePlatform — gallery, team workspace, admin review, and real-time collaboration.

**React 19 + TypeScript 5 + Vite 7. CRDT collaboration via Yjs, STOMP over
SockJS for server-pushed presence, Radix UI primitives, and Tailwind.**

[![Stars](https://img.shields.io/github/stars/dengxingzhi000/cloud-picture-platform-web?color=ffcb47&labelColor=black&style=flat-square&logo=github)](https://github.com/dengxingzhi000/cloud-picture-platform-web/stargazers)
[![Forks](https://img.shields.io/github/forks/dengxingzhi000/cloud-picture-platform-web?color=8ae8ff&labelColor=black&style=flat-square&logo=github)](https://github.com/dengxingzhi000/cloud-picture-platform-web/network/members)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](#license)

[Quick start](#quick-start) · [Capabilities](#capabilities) · [Stack](#stack) · [Structure](#project-structure) · [API proxy](#api-proxy) · [Contributing](#contributing)

<code>npm install &amp;&amp; npm run dev</code>

</div>

> [!NOTE]
> **The backend must be running on `http://localhost:8080`.** This frontend has no
> mock mode — the Vite dev server proxies `/api`, `/uploads`, and `/ws` straight
> through, so a stopped backend surfaces as failed requests rather than a blank page.
>
> The paired backend lives at
> [cloud-picture-platform](https://github.com/dengxingzhi000/cloud-picture-platform).

---

Collaboration is the hard part of a picture tool: two people in the same image at
the same time, a cursor that moves, an edit lock that releases when someone closes
the tab. This frontend handles that with two mechanisms rather than one — a CRDT
layer for document state and a socket layer for server-pushed presence.

## Quick start

### Prerequisites

- **Node.js 18+**
- **Backend running on `http://localhost:8080`** (see
  [cloud-picture-platform](https://github.com/dengxingzhi000/cloud-picture-platform))

### Install & run

```bash
git clone https://github.com/dengxingzhi000/cloud-picture-platform-web.git
cd cloud-picture-platform-web
npm install
npm run dev
```

### Commands

```bash
npm run dev       # Vite dev server (proxies /api, /uploads, /ws to localhost:8080)
npm run build     # tsc -b && vite build
npm run preview   # preview production build
```

> [!NOTE]
> **There is no `test` script and no CI workflow in this repository.** Type
> correctness is currently enforced only by `tsc -b` as part of `npm run build`, so
> run a build before pushing.

## Capabilities

| Capability              | What it does                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Picture gallery         | Browse, search, upload, tag, and manage pictures with public/private/team visibility |
| Team workspace          | Team creation, member management, shared picture spaces                              |
| Admin review            | Moderation dashboard for the public picture approval workflow                        |
| Real-time collaboration | Presence, edit locks, cursors, selections, shared annotations                        |
| AI chat panel           | Integrated AI assistant for picture analysis and conversation                        |
| RBAC & permissions      | Menu-based route guards with a dynamic sidebar built from backend permission data    |
| Excalidraw integration  | Collaborative drawing embedded in the editor                                         |
| Image editing           | Client-side image editing via the Filerobot editor                                   |
| 3D viewing              | three.js / React Three Fiber rendering                                               |
| Internationalization    | i18next with zh-CN and en-US                                                         |

> [!TIP]
> **Two collaboration mechanisms coexist by design.** Yjs (`yjs`, `y-websocket`,
> `y-indexeddb`, `@hocuspocus/provider`) handles CRDT document state and offline
> persistence, while STOMP over SockJS carries server-pushed presence and lock
> events. They are not interchangeable — Yjs owns the document, STOMP owns the
> ephemeral session state.

## Stack

| Technology                      | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| React 19                        | UI framework                                |
| TypeScript 5                    | Type safety                                 |
| Vite 7                          | Build tool & dev server                     |
| React Router 7                  | Client-side routing                         |
| Zustand                         | Client-side state                           |
| Axios                           | HTTP client                                 |
| STOMP + SockJS                  | Server-pushed real-time events              |
| Yjs + y-websocket + y-indexeddb | CRDT document state and offline persistence |
| Hocuspocus provider             | Yjs WebSocket provider                      |
| Radix UI                        | Accessible UI primitives                    |
| Tailwind CSS                    | Utility-first styling                       |
| Excalidraw                      | Collaborative drawing                       |
| Filerobot image editor          | Client-side image editing                   |
| three.js / React Three Fiber    | 3D rendering                                |
| GSAP / motion                   | Animation                                   |
| i18next / react-i18next         | Internationalization                        |
| Lucide React                    | Icons                                       |

## Project structure

```text
src/
├── api/                    HTTP API wrappers (auth, pictures, teams, roles, ai, ...)
├── react-app/
│   ├── App.tsx             Root component with routing
│   ├── pages/              Page components (gallery, admin, team, ...)
│   ├── components/         Shared components (AiChatPanel, ...)
│   └── hooks/              Custom React hooks
├── stores/                 Lightweight client-side persistence helpers
├── utils/                  Auth and formatting utilities
└── collab-types.d.ts       Collaboration event typings
```

## API proxy

The Vite dev server proxies the following paths to the backend:

| Path       | Target                              |
| ---------- | ----------------------------------- |
| `/api`     | `http://localhost:8080`             |
| `/uploads` | `http://localhost:8080`             |
| `/ws`      | `http://localhost:8080` (WebSocket) |

## Contributing

### Conventions

- React 19 + TypeScript 5
- Functional components with hooks
- API wrappers in `src/api/` — one file per domain
- Pages in `src/react-app/pages/`, components in `src/react-app/components/`

### Workflow

1. Fork the repo
2. Create a feature branch
3. Commit changes
4. Push and open a Pull Request

## License

Apache License 2.0.

> [!NOTE]
> The `LICENSE` file is **missing from this repository** — the text above records
> the intended license, but the file needs to be added before publishing.
