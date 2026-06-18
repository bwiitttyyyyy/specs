---

description: "Task list for Speckit Web Dashboard implementation"
---

# Tasks: Speckit Web Dashboard

**Input**: Design documents from `/specs/001-speckit-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks ARE included. The project constitution (v1.0.0, Principle IV — Quality Gates &
Test Discipline) mandates unit tests on risky core logic and end-to-end coverage of the primary
journeys, with a green CI gate before merge. Tests are therefore non-optional here.

**Organization**: Tasks are grouped by user story (US1–US4) to enable independent implementation,
testing, and delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story the task serves (US1–US4); Setup/Foundational/Polish have no story label
- Exact file paths are included in each description

## Path Conventions

Web application (per plan.md): backend service in `backend/`, React SPA in `frontend/`, shared
TypeScript types in `shared/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo and toolchain initialization.

- [X] T001 Create monorepo structure (`backend/`, `frontend/`, `shared/`) per plan.md Project Structure
- [X] T002 Initialize backend TypeScript project with Fastify, `ws`, and better-sqlite3 in `backend/package.json`
- [X] T003 [P] Initialize frontend React + TypeScript project with Vite in `frontend/package.json`
- [X] T004 [P] Configure Tailwind CSS + shadcn/ui with shared design tokens (color, spacing, typography) in `frontend/src/styles/`
- [X] T005 [P] Configure ESLint + Prettier (no-`any` rule) across `backend/`, `frontend/`, `shared/`
- [X] T006 [P] Configure test runners: Vitest + React Testing Library and Playwright in `frontend/`, Vitest in `backend/`
- [X] T007 [P] Set up CI pipeline running build + type-check + lint + tests as the green merge gate (Principle IV) in `.github/workflows/ci.yml`
- [X] T008 [P] Define shared TypeScript types (Project, Spec, Artifact, Session, InteractionRecord, REST + WebSocket frame schemas) in `shared/src/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T009 Initialize SQLite database with migrations for `projects` and `interactions` tables in `backend/src/models/db.ts`
- [X] T010 [P] Implement Project model + repository (CRUD over SQLite) in `backend/src/models/project.ts`
- [X] T011 [P] Implement InteractionRecord model + append-only repository in `backend/src/models/interaction.ts`
- [X] T012 [P] Implement single-user auth gate middleware (credential check, 401 on failure — FR-022) in `backend/src/lib/auth.ts`
- [X] T013 Bootstrap Fastify server with shared error model (`{error, detail}`, 401/503 handling) and auth wiring in `backend/src/api/server.ts`
- [X] T014 [P] Implement project registry service (register with `specsPath` existence/readability validation, list, activate — FR-001/002) in `backend/src/services/projects/registry.ts`
- [X] T015 Implement project REST endpoints (`GET /api/projects`, `POST /api/projects`, `POST /api/projects/{id}/activate`) per contracts/rest-api.md in `backend/src/api/routes/projects.ts`
- [X] T016 [P] Build frontend app shell: routing, TanStack Query provider, auth-credential handling in `frontend/src/app/`
- [X] T017 [P] Build reusable design-system primitives (Button, Panel, StatusBadge, Spinner, EmptyState) in `frontend/src/components/ui/`
- [X] T018 [P] Implement frontend REST API client (typed, auth header, 401/503 surfacing) in `frontend/src/services/api.ts`
- [X] T019 [P] Implement Zustand connection-status store (idle/working/awaiting-input/disconnected) in `frontend/src/state/connection.ts`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Browse and read specs across projects (Priority: P1) 🎯 MVP

**Goal**: Select a project, browse its specs with derived lifecycle status, search, and read a
spec's artifacts in a readable, navigable view (reading does not require a live session).

**Independent Test**: quickstart.md Scenario A — open the dashboard, select a project, list specs,
open a spec and read its rendered artifacts, and search to locate a spec (SC-001, SC-002).

### Tests for User Story 1 ⚠️

- [X] T020 [P] [US1] Unit test for lifecycle-status derivation (artifact presence → status) in `backend/tests/unit/status.test.ts`
- [X] T021 [P] [US1] Contract test for specs endpoints (list, get spec, get artifact, search) in `backend/tests/contract/specs.test.ts`
- [X] T022 [P] [US1] E2E test for browse/read/search journey in `frontend/tests/e2e/browse-read.spec.ts`

### Implementation for User Story 1

- [X] T023 [P] [US1] Implement spec discovery service (scan `specs/<NNN-name>/`, parse number/name) in `backend/src/services/specs/discovery.ts`
- [X] T024 [P] [US1] Implement lifecycle-status derivation from artifact presence/content (FR-005, FR-010) in `backend/src/services/specs/status.ts`
- [X] T025 [P] [US1] Implement artifact read service (load content + compute fingerprint) in `backend/src/services/specs/artifacts.ts`
- [X] T026 [US1] Implement specs REST endpoints (list with `?q` search, get spec, get artifact) per contracts/rest-api.md in `backend/src/api/routes/specs.ts` (depends on T023, T024, T025)
- [X] T027 [P] [US1] Build minimal project picker UI (list + select active project) in `frontend/src/pages/ProjectPicker.tsx`
- [X] T028 [P] [US1] Build spec list view with lifecycle-status badges, virtualized rendering, and search/filter (FR-008/009) in `frontend/src/pages/SpecList.tsx`
- [X] T029 [P] [US1] Build readable artifact renderer (react-markdown + remark/rehype: GFM, slugged headings, syntax highlight) in `frontend/src/components/SpecViewer.tsx`
- [X] T030 [US1] Build spec workspace layout with artifact + section navigation and "step not yet run" indicators for missing artifacts (FR-007/008/010) in `frontend/src/pages/SpecWorkspace.tsx` (depends on T029)

**Checkpoint**: User Story 1 fully functional and independently testable — the reading MVP.

---

## Phase 4: User Story 2 - Iterate on a spec through the remote Claude session (Priority: P2)

**Goal**: Run speckit commands and chat against a selected spec via the remote session, stream
output live, answer clarifying questions, cancel runs, reflect file changes, and view history.

**Independent Test**: quickstart.md Scenario B — run a command (output ≤2s), send a chat that
updates an artifact, answer a clarification, cancel a run, and survive a mid-stream disconnect with
preserved view/output (SC-003, SC-004, SC-005).

### Tests for User Story 2 ⚠️

- [X] T031 [P] [US2] Unit test for streamed-output parser (ordered chunk assembly) in `backend/tests/unit/stream.test.ts`
- [X] T032 [P] [US2] Unit test for session connection/activity state machine in `backend/tests/unit/session-state.test.ts`
- [X] T033 [P] [US2] WebSocket contract tests (run_command, clarification→answer, cancel, disconnect→reconnect) per contracts/session-ws.md in `backend/tests/contract/session-ws.test.ts`
- [X] T034 [P] [US2] E2E test for iterate-via-session journey using a mocked session in `frontend/tests/e2e/iterate-session.spec.ts`

### Implementation for User Story 2

- [X] T035 [P] [US2] Implement streamed-output parser lib in `backend/src/lib/stream.ts`
- [X] T036 [US2] Implement session service: attach to remote Claude session + connection/activity state machine (FR-003/004) in `backend/src/services/sessions/session.ts`
- [X] T037 [US2] Implement command runner: dispatch speckit commands + chat, stream output, detect clarifying questions, cancel (FR-011/012/013/014/015) in `backend/src/services/commands/runner.ts` (depends on T035, T036)
- [X] T038 [P] [US2] Implement artifact file-change watcher emitting `file_changed` notifications (FR-016) in `backend/src/services/specs/watch.ts`
- [X] T039 [US2] Implement WebSocket gateway (auth, per-spec channel, all client/server frames) per contracts/session-ws.md in `backend/src/api/ws.ts` (depends on T037, T038)
- [X] T040 [US2] Persist streamed interactions to InteractionRecord and add history endpoint (`GET .../interactions`, FR-017) in `backend/src/api/routes/interactions.ts`
- [X] T041 [P] [US2] Implement frontend WebSocket client (frame send/receive, ordered output buffer, reconnect) in `frontend/src/services/ws.ts`
- [X] T042 [P] [US2] Build command bar (one-click speckit commands) in `frontend/src/components/CommandBar.tsx`
- [X] T043 [US2] Build chat + streamed-output panel with session activity indicator (idle/working/awaiting-input/disconnected — SC-004) in `frontend/src/components/SessionPanel.tsx` (depends on T041)
- [X] T044 [US2] Build clarification prompt UI and cancel control (FR-014/015) in `frontend/src/components/ClarificationPrompt.tsx` (depends on T043)
- [X] T045 [US2] Wire `file_changed` to refresh/stale-signal the open artifacts and render interaction history (FR-016/017) in `frontend/src/pages/SpecWorkspace.tsx` (depends on T030, T043)
- [X] T046 [US2] Implement disconnect handling that preserves the open spec view + partial output and offers reconnect (FR-004, SC-005) in `frontend/src/state/connection.ts` (depends on T019, T041)

**Checkpoint**: User Stories 1 and 2 both work independently; the dashboard is now a working surface.

---

## Phase 5: User Story 3 - Edit spec content directly in the dashboard (Priority: P3)

**Goal**: Edit an artifact's markdown in the dashboard and save it, with unsaved-change warnings and
conflict surfacing (never silent overwrite).

**Independent Test**: quickstart.md Scenario C — edit and save an artifact; trigger a concurrent
change and confirm a conflict is surfaced; confirm the unsaved-changes warning (FR-018/019/020,
SC-007).

### Tests for User Story 3 ⚠️

- [X] T047 [P] [US3] Unit test for conflict detection (baseline fingerprint vs on-disk) in `backend/tests/unit/conflict.test.ts`
- [X] T048 [P] [US3] E2E test for edit-and-save + conflict + unsaved-warning journey in `frontend/tests/e2e/edit-conflict.spec.ts`

### Implementation for User Story 3

- [X] T049 [P] [US3] Implement conflict-detection service (fingerprint baseline + re-check on save) in `backend/src/services/conflicts/detect.ts`
- [X] T050 [US3] Implement artifact save endpoint (`PUT .../artifacts/{type}`, 409 with current content on conflict — FR-020) per contracts/rest-api.md in `backend/src/api/routes/specs.ts` (depends on T049)
- [X] T051 [P] [US3] Build in-dashboard artifact editor with dirty-state tracking (FR-018) in `frontend/src/components/ArtifactEditor.tsx`
- [X] T052 [US3] Add unsaved-changes navigation guard (FR-019) in `frontend/src/pages/SpecWorkspace.tsx` (depends on T051)
- [X] T053 [US3] Build conflict-resolution UI with explicit overwrite confirmation (FR-020/023, SC-007) in `frontend/src/components/ConflictDialog.tsx` (depends on T050, T051)

**Checkpoint**: User Stories 1–3 all independently functional.

---

## Phase 6: User Story 4 - Connect, switch, and manage projects (Priority: P4)

**Goal**: Register multiple projects, switch the active project, see each project's session
connection status, and create a new spec from the dashboard.

**Independent Test**: quickstart.md Scenario D — register a second project, switch active project
(spec list + session context update), view per-project session status, and create a new spec via
the session (FR-002/003/021).

### Tests for User Story 4 ⚠️

- [X] T054 [P] [US4] E2E test for register/switch/status/new-spec journey in `frontend/tests/e2e/manage-projects.spec.ts`

### Implementation for User Story 4

- [X] T055 [P] [US4] Build project registration form (name, specsPath, sessionTarget with validation feedback — FR-001) in `frontend/src/pages/ProjectRegister.tsx`
- [X] T056 [US4] Build multi-project switcher that swaps spec list + session context on activate (FR-002) in `frontend/src/components/ProjectSwitcher.tsx` (depends on T027)
- [X] T057 [P] [US4] Add per-project session connection-status indicators to the project list (FR-003) in `frontend/src/pages/ProjectPicker.tsx` (depends on T036, T056)
- [X] T058 [US4] Implement "create new spec" flow that runs the specify step via the session and adds it to the list (FR-021) in `frontend/src/components/NewSpecDialog.tsx` (depends on T037, T043)

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality, accessibility, performance, and validation across all stories.

- [X] T059 [P] Accessibility pass: WCAG 2.1 AA contrast, focus order, screen-reader labels, full keyboard navigation (Principle I) across `frontend/src/`
- [X] T060 [P] Performance: verify streamed output renders ≤2s (SC-004) and spec/project lists stay responsive at scale (SC-002) in `frontend/src/`
- [X] T061 [P] Security hardening: enforce auth gate on the WebSocket upgrade and confirm destructive actions require confirmation (FR-022/023) in `backend/src/api/ws.ts`
- [X] T062 [P] Documentation: developer README and run instructions in `docs/`
- [X] T063 Run quickstart.md Scenarios A–D end-to-end and confirm all success criteria (SC-001…SC-008)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phases 3–6)**: All depend on Foundational. US1 is the MVP. US2 depends only on
  Foundational; US3 and US4 reuse US1/US2 components but remain independently testable.
- **Polish (Phase 7)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational. No dependency on other stories (reading is disk-only).
- **US2 (P2)**: After Foundational. Adds the session layer; integrates into the US1 workspace.
- **US3 (P3)**: After Foundational. Reuses the US1 artifact view; independently testable.
- **US4 (P4)**: After Foundational. Reuses US1 project picker and US2 command infra for new-spec.

### Within Each User Story

- Tests written first and failing before implementation (Principle IV).
- Models → services → endpoints → frontend integration.

### Parallel Opportunities

- All `[P]` Setup tasks (T003–T008) can run together.
- All `[P]` Foundational tasks (T010–T012, T014, T016–T019) can run together after T009/T013.
- Once Foundational completes, US1–US4 can be staffed in parallel.
- All `[P]` test tasks within a story can run together before that story's implementation.

---

## Parallel Example: User Story 1

```bash
# Tests for User Story 1 (write first, ensure they fail):
Task: "Unit test for lifecycle-status derivation in backend/tests/unit/status.test.ts"
Task: "Contract test for specs endpoints in backend/tests/contract/specs.test.ts"
Task: "E2E test for browse/read/search journey in frontend/tests/e2e/browse-read.spec.ts"

# Backend services for User Story 1 (different files):
Task: "Spec discovery service in backend/src/services/specs/discovery.ts"
Task: "Lifecycle-status derivation in backend/src/services/specs/status.ts"
Task: "Artifact read service in backend/src/services/specs/artifacts.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Run quickstart Scenario A; a polished, readable spec browser is the MVP.
5. Deploy/demo.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → readable browser (MVP) → demo.
3. US2 → live iteration via the session → demo.
4. US3 → direct editing with conflict safety → demo.
5. US4 → multi-project management + new-spec creation → demo.
6. Polish → accessibility, performance, security, quickstart validation.

### Parallel Team Strategy

After Foundational: Developer A → US1, Developer B → US2, Developer C → US3/US4. Stories integrate
through the shared types (T008) and the US1 workspace shell without breaking independence.

---

## Notes

- `[P]` = different files, no dependency on incomplete tasks.
- `[Story]` label maps each task to its user story for traceability.
- Each user story is independently completable and testable.
- Verify tests fail before implementing (Principle IV).
- Commit after each task or logical group; keep CI green.
- Disk spec files remain the source of truth; SQLite holds only registry + interaction history.
