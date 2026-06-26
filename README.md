# Cloud Picture Platform Web

<div align="center">

[![GitHub Stars](https://img.shields.io/github/stars/dengxingzhi000/cloud-picture-platform-web?style=flat-square&color=green&logo=github&logoColor=white)](https://github.com/dengxingzhi000/cloud-picture-platform-web)
[![GitHub Forks](https://img.shields.io/github/forks/dengxingzhi000/cloud-picture-platform-web?style=flat-square&color=blue&logo=github&logoColor=white)](https://github.com/dengxingzhi000/cloud-picture-platform-web)
[![License](https://img.shields.io/badge/license-Apache%202.0-red?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)

React frontend for the Cloud Picture Platform — gallery, team workspace, admin review, and real-time collaboration.

[Features](#features) · [Quick Start](#quick-start) · [Stack](#stack) · [Project Structure](#project-structure) · [Contributing](#contributing)

</div>

---

> **React 19 + TypeScript 5 + Vite 7.** STOMP over SockJS for real-time collaboration. Radix UI primitives. Backend must be running on `http://localhost:8080`.

---

## Features

- **Picture Gallery.** Browse, search, upload, tag, and manage pictures with public/private/team visibility.
- **Team Workspace.** Team creation, member management, shared picture spaces.
- **Admin Review.** Moderation dashboard for public picture approval workflow.
- **Real-time Collaboration.** STOMP + SockJS sessions — presence, edit locks, cursors, selections, shared annotations.
- **AI Chat Panel.** Integrated AI assistant for picture analysis and conversation.
- **RBAC & Permissions.** Menu-based route guards, dynamic sidebar from backend permission data.
- **Excalidraw Integration.** Collaborative drawing experience embedded in the editor.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Backend running on `http://localhost:8080`

### Install & Run

```bash
git clone https://github.com/dengxingzhi000/cloud-picture-platform-web.git
cd cloud-picture-platform-web
npm install
npm run dev
```

### Common Commands

```bash
npm run dev       # Vite dev server (proxies /api, /uploads, /ws to localhost:8080)
npm run build     # tsc -b && vite build
npm run preview   # preview production build
```

---

## Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TypeScript 5 | Type safety |
| Vite 7 | Build tool & dev server |
| React Router 7 | Client-side routing |
| Axios | HTTP client |
| STOMP + SockJS | Real-time WebSocket communication |
| Radix UI | Accessible UI primitives |
| Excalidraw | Collaborative drawing |

---

## Project Structure

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

---

## API Proxy

The Vite dev server proxies the following paths to the backend:

| Path | Target |
|------|--------|
| `/api` | `http://localhost:8080` |
| `/uploads` | `http://localhost:8080` |
| `/ws` | `http://localhost:8080` (WebSocket) |

---

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

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).
