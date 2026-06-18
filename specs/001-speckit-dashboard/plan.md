# Implementation Plan: Speckit Web Dashboard

**Branch**: `001-speckit-dashboard` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-speckit-dashboard/spec.md`

## Summary

A desktop-first web dashboard that gives a single user a slick GUI for reading, editing, and
iterating on speckit specs across multiple project workspaces. Each project is paired with an
externally provisioned **remote Claude session**; the dashboard browses a project's specs,
renders their artifacts readably, and lets the user drive the full speckit lifecycle through the
session via both one-click commands and free-form chat — with output streamed live and file
changes reflected back. Technical approach: a React + TypeScript single-page frontend backed by a
TypeScript service that brokers the spec files on disk and a bidirectional, streaming connection
to each project's remote Claude session.

## Technical Context

**Language/Version**: TypeScript 5.x across both tiers (Node.js 20+ runtime for the service)

**Primary Dependencies**:
- Frontend: React 18, Vite, Tailwind CSS + shadcn/ui (Radix primitives) for the design system,
  TanStack Query (server/session state), Zustand (local UI state), react-markdown + remark/rehype
  (readable spec rendering), a virtualized list for large spec/project sets.
- Service: Fastify (HTTP), `ws` (WebSocket, bidirectional streaming), the Claude Agent SDK
  (`@anthropic-ai/claude-agent-sdk`) / Claude Code headless mode to attach to a project's remote
  session and run speckit slash commands.

**Storage**: Spec files on disk in each project's `specs/` layout are the **source of truth**
(read/written directly). A lightweight SQLite database (better-sqlite3) holds only dashboard-local
state: the project registry and per-spec interaction history (commands + chat transcripts).

**Testing**: Vitest + React Testing Library (unit/component), Playwright (end-to-end for the
primary journeys), contract tests for the WebSocket message schema.

**Target Platform**: Modern evergreen desktop browsers (Chrome, Firefox, Safari, Edge).

**Project Type**: Web application (frontend SPA + backend service).

**Performance Goals**: Streamed command/chat output begins rendering ≤2s after a user action
(SC-004); open-dashboard-to-readable-spec ≤30s (SC-001); locate a spec in a 50+ spec project ≤10s
via browse/search (SC-002).

**Constraints**: Single authorized user (auth gate on dashboard + sessions); resilient to session
disconnect with zero lost work and preserved partial output (SC-005); conflicting edits surfaced
100% of the time, never silently overwritten (SC-007); UI never appears frozen during long-running
commands.

**Scale/Scope**: One user; multiple projects (tens); tens–hundreds of specs per project; four
prioritized user stories (P1 browse/read → P2 iterate via session → P3 direct edit → P4 manage
projects).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against Speckit Web Dashboard Constitution v1.0.0.

| Principle | Gate | Initial | Post-Design |
|-----------|------|---------|-------------|
| I. UX Excellence (NON-NEGOTIABLE) | Every async surface has explicit loading/streaming/idle/working/awaiting-input/error/success states; WCAG 2.1 AA; readable spec rendering; streamed output ≤2s | PASS | PASS |
| II. Component-Driven React Frontend | React + TypeScript, no `any` except justified boundaries, reusable components, shared design tokens (shadcn/ui + Tailwind) | PASS | PASS |
| III. Resilient Remote-Session Integration | Session boundary modeled as unreliable; connection states surfaced; no lost work on disconnect; conflict detection; destructive-action confirmation | PASS | PASS |
| IV. Quality Gates & Test Discipline | Unit tests on session state, conflict detection, status derivation, stream parsing; e2e on the four journeys; green CI (build/type-check/lint/test) to merge | PASS | PASS |
| V. Simplicity & Scoped Surface (YAGNI) | Single-user/desktop scope; SQLite over heavier infra; dependencies justified against present need; scope changes go through spec | PASS | PASS |

**Result**: No violations. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-speckit-dashboard/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── rest-api.md       # HTTP endpoints (projects, specs, artifacts)
│   └── session-ws.md     # WebSocket message schema (commands, chat, streaming)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/          # Project, Spec, Artifact, Session, InteractionRecord types + SQLite access
│   ├── services/
│   │   ├── projects/    # project registry (register, list, switch)
│   │   ├── specs/        # discover specs, read/write artifacts, lifecycle-status derivation
│   │   ├── sessions/     # remote Claude session lifecycle, connection-state machine
│   │   ├── commands/     # run speckit slash commands, stream + clarifying-input handling
│   │   └── conflicts/    # change detection / conflict surfacing for edits
│   ├── api/             # Fastify HTTP routes + WebSocket gateway
│   └── lib/             # streaming parser, schema validation, auth gate
└── tests/
    ├── contract/        # WebSocket + REST schema tests
    ├── integration/     # session-disconnect, conflict, command-with-clarification flows
    └── unit/            # status derivation, stream parsing, conflict detection

frontend/
├── src/
│   ├── components/      # design-system primitives + composed UI (spec viewer, chat, command bar)
│   ├── pages/           # project picker, spec list, spec workspace
│   ├── services/        # API client, WebSocket client, query hooks (TanStack Query)
│   └── state/           # Zustand UI stores, connection-status store
└── tests/
    ├── unit/            # component + hook tests (Vitest + RTL)
    └── e2e/             # Playwright journeys (browse, iterate, edit, manage projects)
```

**Structure Decision**: Web application (Option 2) — a React SPA in `frontend/` and a TypeScript
service in `backend/`. The split is required because the dashboard must (a) serve a rich browser UI
(Principle I/II) and (b) hold the privileged, stateful connections to each project's remote Claude
session and the spec files on disk (Principle III). Sharing TypeScript across both tiers keeps the
single-language simplicity called for by Principle V.

## Complexity Tracking

> No Constitution Check violations. No entries required.
