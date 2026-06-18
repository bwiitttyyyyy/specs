# Speckit Web Dashboard

A desktop-first web dashboard for reading, managing, and iterating on
[speckit](https://github.com/github/spec-kit) specs across multiple projects. Each project is
paired with a remote Claude session you can drive — running speckit commands and chatting — without
leaving the browser.

> Spec: [`specs/001-speckit-dashboard/`](./specs/001-speckit-dashboard/) (spec, plan, tasks,
> contracts, data model, quickstart).

## Features

- **Browse & read** (US1): pick a project, browse its specs with derived lifecycle status, search,
  and read every artifact rendered readably.
- **Iterate via the session** (US2): run speckit commands and chat against a spec; output streams
  live, clarifying questions are answerable in-app, runs are cancellable, and disconnects preserve
  your view and partial output.
- **Direct editing** (US3): edit an artifact and save it, with unsaved-change warnings and
  conflict detection that never silently overwrites.
- **Manage projects** (US4): register projects, switch the active one, see per-project session
  status, and create new specs.

## Architecture

| Tier         | Stack                                                                          | Location    |
| ------------ | ------------------------------------------------------------------------------ | ----------- |
| Frontend     | React 18 + TypeScript, Vite, Tailwind, TanStack Query, Zustand, react-markdown | `frontend/` |
| Backend      | TypeScript, Fastify (HTTP + WebSocket via `@fastify/websocket`/`ws`)           | `backend/`  |
| Shared types | TypeScript                                                                     | `shared/`   |

- Spec **files on disk are the source of truth**. The backend reads/writes them directly and
  derives lifecycle status from artifact presence.
- Dashboard-local state (project registry, interaction history) is persisted as JSON under the data
  dir. _(The plan specifies SQLite; this environment lacks a native build toolchain, so a
  JSON-backed `Repository` stands in behind the same interface — see `backend/src/models/store.ts`.)_
- The **remote Claude session** is abstracted by `SessionAdapter`. A deterministic
  `MockSessionAdapter` powers local dev and tests; `ClaudeSessionAdapter` is the stub for attaching
  to a real, externally-provisioned session via the Claude Agent SDK. Select with
  `SPECKIT_SESSION_ADAPTER=mock|claude`.

## Getting started

```bash
npm install

# Terminal 1 — backend (defaults: 127.0.0.1:4317, token "dev-token", mock session)
SPECKIT_DASHBOARD_TOKEN=dev-token npm run dev:backend

# Terminal 2 — frontend (http://localhost:5173)
npm run dev:frontend
```

Open the dashboard, register a project pointing at a directory that contains a `specs/` layout
(e.g. this repo's own `specs/`), and start browsing.

### Configuration (backend env)

| Variable                  | Default     | Purpose                              |
| ------------------------- | ----------- | ------------------------------------ |
| `PORT`                    | `4317`      | HTTP/WebSocket port                  |
| `HOST`                    | `127.0.0.1` | bind address                         |
| `SPECKIT_DASHBOARD_TOKEN` | `dev-token` | single-user auth credential (FR-022) |
| `SPECKIT_DASHBOARD_DATA`  | `./data`    | dashboard-local persistence dir      |
| `SPECKIT_SESSION_ADAPTER` | `mock`      | `mock` or `claude`                   |

The frontend reads `VITE_API_BASE` / `VITE_WS_BASE` (default `http://127.0.0.1:4317` /
`ws://127.0.0.1:4317`) and stores the auth token in `localStorage` under `speckit-token`.

## Quality gates

Per the project constitution (Principle IV), all of these must pass before merge — see
`.github/workflows/ci.yml`.

```bash
npm run typecheck   # tsc across all workspaces
npm run lint        # eslint (no-`any` enforced)
npm run format      # prettier --check
npm run test        # vitest unit + contract tests (backend + frontend)
npm run build       # production build
npm run e2e         # Playwright journeys (needs: npx playwright install chromium)
```

## Tests

- **Backend** (`backend/tests/`): unit tests for lifecycle-status derivation, stream assembly,
  session state machine, and conflict detection; contract tests for the REST endpoints and the
  WebSocket gateway (driven through the mock session).
- **Frontend** (`frontend/tests/`): a Vitest unit test for the session-store reducer, and four
  Playwright e2e specs — one per user story (browse/read, iterate-via-session, edit/conflict,
  manage-projects) — that boot the real backend + frontend.
