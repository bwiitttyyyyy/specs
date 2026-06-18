# Phase 0 Research: Speckit Web Dashboard

**Date**: 2026-06-17 | **Plan**: [plan.md](./plan.md)

All Technical Context unknowns are resolved below. No `NEEDS CLARIFICATION` markers remain.

## 1. Remote Claude session integration

- **Decision**: The backend attaches to each project's externally provisioned remote Claude
  session via the Claude Agent SDK / Claude Code headless (streaming) interface. The dashboard
  does **not** provision, authenticate, or choose a model for the session — it connects to an
  already-running session bound to the project's working directory, sends speckit slash-command
  prompts and chat turns, and consumes the streamed assistant/tool/result events.
- **Rationale**: The spec and constitution explicitly treat the session as an external dependency
  (Assumption: "Remote Claude session exists and is provisioned separately"). Using the SDK's
  streaming event interface gives us the live output (SC-004) and the tool/permission events needed
  to detect when a command is awaiting user input (FR-014).
- **Alternatives considered**:
  - *Shelling out to the `claude` CLI per command* — rejected: harder to multiplex, weaker
    structured-event access, and no clean attach-to-existing-session story.
  - *Re-implementing speckit command logic in the dashboard* — rejected: duplicates the source of
    truth and violates Principle V; the session already owns the speckit workflow.

## 2. Client transport for streaming + clarifying input

- **Decision**: A single WebSocket per active spec carries bidirectional traffic: client→server
  (run command, chat message, answer-to-clarification, cancel) and server→client (streamed output
  chunks, status transitions, clarification requests, file-changed notifications). REST is used for
  non-streaming CRUD (project registry, spec list, artifact read/write).
- **Rationale**: Speckit commands pause to ask the user questions (FR-014), so the channel must be
  bidirectional, not one-way. WebSocket also cleanly conveys connection-state changes (FR-003/004)
  the UI must surface (Principle I/III).
- **Alternatives considered**:
  - *Server-Sent Events (SSE)* — rejected: one-directional; clarifying answers and cancel would
    need a separate channel, splitting the session state.
  - *HTTP long-polling* — rejected: poor latency and awkward state for live streaming.

## 3. Spec discovery & lifecycle-status derivation

- **Decision**: Specs are discovered by scanning each project's `specs/<NNN-name>/` directories.
  A spec's lifecycle status is **derived** from which artifacts exist and their content cues
  (e.g., `spec.md` → specified; `plan.md` → planned; `tasks.md` → tasks generated; presence of a
  populated `checklists/` → reviewed). Files on disk are authoritative; SQLite never caches spec
  content, only interaction history and the project registry.
- **Rationale**: Matches FR-005/FR-007/FR-010 and keeps the dashboard a faithful view over the real
  speckit layout (constitution: "specs source of truth"). Derivation avoids a status field that can
  drift from reality.
- **Alternatives considered**:
  - *Persisting status in the DB* — rejected: drifts from the files the session edits out-of-band.
  - *Requiring a manifest file per spec* — rejected: imposes structure speckit doesn't produce.

## 4. Conflict detection for concurrent edits

- **Decision**: When the user opens an artifact for editing, capture a baseline fingerprint
  (content hash + mtime). On save, re-read the file; if the fingerprint changed (session wrote it,
  or external edit), block the write and surface a conflict for the user to resolve (FR-020,
  SC-007). The same file-watch that drives "view changed" notifications (FR-016) feeds this.
- **Rationale**: Principle III mandates conflicts are surfaced 100% of the time and never silently
  overwritten. A hash+mtime baseline is the simplest reliable detector for a single-user,
  file-on-disk model (Principle V).
- **Alternatives considered**:
  - *Last-write-wins* — rejected: violates Principle III / SC-007.
  - *Operational-transform / CRDT merge* — rejected: massive over-engineering for single-user scope
    (Principle V); deferred unless multi-user is ever specified.

## 5. Frontend design system & readable rendering

- **Decision**: Tailwind CSS + shadcn/ui (Radix primitives) as the shared design system with
  centralized tokens (color, spacing, typography). Specs render via react-markdown with remark/rehype
  plugins (GFM tables, slugged headings for in-spec navigation, syntax highlighting).
- **Rationale**: Directly serves Principle I (slick, accessible — Radix gives WCAG-friendly
  primitives) and Principle II (reusable components, shared tokens). react-markdown yields the
  "visually superior to raw markdown" reading experience (FR-007).
- **Alternatives considered**:
  - *Heavy component kit (e.g., MUI)* — rejected: harder to make feel bespoke/"slick"; heavier.
  - *Hand-rolled markdown parsing* — rejected: reinvents a solved problem, risks rendering bugs.

## 6. Dashboard-local persistence

- **Decision**: SQLite (better-sqlite3) for the project registry and per-spec interaction history
  (command runs + chat transcripts, FR-017). Synchronous, file-based, zero external service.
- **Rationale**: Single-user scope makes a server database unjustified (Principle V); SQLite gives
  durable history and simple queries with no infra. Spec content stays on disk, never duplicated.
- **Alternatives considered**:
  - *Plain JSON files* — rejected: weak for querying/appending transcript history safely.
  - *Postgres/managed DB* — rejected: unjustified infrastructure for one user (Principle V).

## 7. Authorization

- **Decision**: A single-user auth gate (a configured secret/credential) protects both the dashboard
  UI and the WebSocket/REST endpoints that reach the sessions (FR-022). No multi-user roles.
- **Rationale**: Spec Assumption (single authorized user) and constitution access constraint. Keeps
  scope minimal (Principle V) while satisfying FR-022.
- **Alternatives considered**:
  - *Full OAuth/multi-tenant identity* — rejected: out of scope; no second user exists yet.
  - *No auth* — rejected: the endpoints can drive a privileged session; must be restricted.

## 8. Testing strategy

- **Decision**: Vitest + React Testing Library for unit/component; Playwright for the four
  end-to-end journeys (browse/read, iterate-via-session, edit-and-save, manage-projects); contract
  tests asserting the WebSocket/REST message schemas. Risky logic (status derivation, stream
  parsing, conflict detection, session state machine) gets dedicated unit tests.
- **Rationale**: Principle IV requires unit coverage on the risky core and e2e on primary journeys,
  with a green CI gate. A mocked session lets disconnect/clarification/conflict paths be tested
  deterministically.
- **Alternatives considered**:
  - *Manual QA only* — rejected: violates Principle IV; the real-time/conflict paths regress
    invisibly.
