# Quickstart & Validation Guide: Speckit Web Dashboard

**Date**: 2026-06-17 | **Plan**: [plan.md](./plan.md)

This guide validates the feature end-to-end against the user stories and success criteria. It is a
run/validation guide — implementation details live in `tasks.md` and the implementation phase.

## Prerequisites

- Node.js 20+ and a package manager (pnpm/npm).
- At least one project with a standard speckit `specs/` layout on disk.
- A reachable, already-provisioned **remote Claude session** bound to that project (provisioned
  outside this app — see plan Assumptions), and its `sessionTarget` identifier.
- The dashboard auth credential configured (single-user gate, FR-022).

## Setup & run

```bash
# from repo root
pnpm install
pnpm --filter backend dev      # starts the service (HTTP + WebSocket)
pnpm --filter frontend dev     # starts the React SPA, opens the dashboard
```

## Validation scenarios

Each maps to a user story / acceptance scenarios in [spec.md](./spec.md) and the success criteria.

### Scenario A — Browse & read (User Story 1, P1 · SC-001, SC-002)

1. Open the dashboard and register/select a project (provide `name`, `specsPath`, `sessionTarget`).
2. Confirm the spec list shows every spec with number, name, and derived lifecycle status.
3. Open a spec; confirm artifacts render readably (formatted, navigable), not as raw markdown.
4. Use search to find a specific spec.
- **Expected**: spec readable within ~30s of opening the dashboard (SC-001); search locates a spec
  in a 50+ spec project within ~10s (SC-002); a spec missing artifacts still opens and shows which
  steps have not run (FR-010).

### Scenario B — Iterate via the session (User Story 2, P2 · SC-003, SC-004, SC-005)

1. With a spec open, click a speckit command (e.g. plan). Confirm output streams in ≤2s (SC-004).
2. Send a chat instruction (e.g. "make FR-003 testable"); confirm the artifact updates afterward.
3. Trigger a command that asks a clarifying question; answer it from the dashboard and confirm the
   command continues (FR-014).
4. Start a long command and cancel it; confirm the UI returns to interactive (FR-015).
5. Kill the session mid-stream; confirm the dashboard shows `disconnected`, keeps the open spec and
   partial output, and reconnects on retry (SC-005).
- **Expected**: a full iteration (command + chat + see update) completes entirely in the dashboard
  (SC-003); session activity (idle/working/awaiting-input) is visible throughout (SC-004).

### Scenario C — Direct edit & conflict (User Story 3, P3 · SC-007)

1. Open an artifact, edit text, save; confirm it persists and re-renders (FR-018).
2. Begin editing, then have the session (or an external process) change the same file; on save,
   confirm a conflict is surfaced rather than a silent overwrite (FR-020, SC-007).
3. Try to navigate away with unsaved edits; confirm the warning appears (FR-019).
- **Expected**: conflicts surfaced 100% of the time; overwrite only after explicit confirmation
  (FR-023).

### Scenario D — Manage projects (User Story 4, P4)

1. Register a second project and switch the active project; confirm the spec list and session
   context update (FR-002).
2. Confirm each project shows its session connection status (FR-003).
3. Create a new spec from the dashboard; confirm the specify step runs via the session and the new
   spec appears in the list (FR-021).

## Automated validation (Principle IV)

- Unit (Vitest): lifecycle-status derivation, stream parsing, conflict detection, session state
  machine.
- Contract: REST schemas ([rest-api.md](./contracts/rest-api.md)) and WebSocket frames
  ([session-ws.md](./contracts/session-ws.md)).
- E2E (Playwright): Scenarios A–D above, using a mocked session for the disconnect / clarification /
  conflict paths.
- Gate: `build` + `type-check` + `lint` + tests must pass green before merge.
