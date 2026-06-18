# Phase 1 Data Model: Speckit Web Dashboard

**Date**: 2026-06-17 | **Plan**: [plan.md](./plan.md)

Two storage tiers:
- **Source of truth (disk)**: Spec, Artifact — read/written directly from each project's `specs/`
  layout. Never duplicated into the database.
- **Dashboard-local (SQLite)**: Project, InteractionRecord — dashboard-owned state.
- **Runtime only (in memory)**: Session — a live connection-state machine, not persisted.

## Entity: Project (Workspace)

Persisted in SQLite. Represents a registered codebase paired with a remote Claude session.

| Field | Type | Rules |
|-------|------|-------|
| id | string (uuid) | primary key |
| name | string | required, unique among registered projects |
| specsPath | string (path) | required; absolute path to the project's `specs/` directory; must exist & be readable |
| sessionTarget | string | required; identifier/endpoint used to attach to the project's remote Claude session |
| createdAt | timestamp | set on registration |
| lastActiveAt | timestamp | updated when selected/used |

Relationships: one Project has many Specs (derived from disk), and many InteractionRecords.

## Entity: Spec (Feature)

Derived from disk; not stored in SQLite. One per `specs/<NNN-name>/` directory.

| Field | Type | Source / Rules |
|-------|------|----------------|
| id | string | the directory name, e.g. `001-speckit-dashboard` |
| number | string | leading `NNN` parsed from the directory name |
| name | string | human title (from `spec.md` heading, fallback to slug) |
| projectId | string | owning Project |
| artifacts | Artifact[] | discovered files within the spec directory |
| lifecycleStatus | enum | **derived**, see below |

**lifecycleStatus** (derived from artifact presence/content, never stored):
`specified` → `clarified` → `planned` → `tasks-generated` → `implementing` → `reviewed`.
Derivation cues: `spec.md` exists → at least `specified`; populated `checklists/` or clarifications
recorded → `clarified`; `plan.md` → `planned`; `tasks.md` → `tasks-generated`; task checkboxes
partially/fully checked → `implementing`/`reviewed`. A spec with missing artifacts still resolves to
the highest stage its present artifacts justify (FR-010).

## Entity: Artifact

Derived from disk; a single document inside a spec directory.

| Field | Type | Rules |
|-------|------|-------|
| type | enum | `spec` \| `plan` \| `tasks` \| `research` \| `data-model` \| `quickstart` \| `checklist` \| `contract` \| `other` |
| path | string | absolute file path |
| relativePath | string | path relative to the spec directory (for display/links) |
| exists | boolean | whether the file is present (drives "which steps not yet run", FR-010) |
| content | string | file text (loaded on open; not cached in DB) |
| fingerprint | string | content hash + mtime captured for conflict detection (FR-020) |

State for editing: `clean` → `dirty` (unsaved edits) → `saving` → `clean`, or → `conflict` when the
on-disk fingerprint changed since the baseline (FR-020, SC-007).

## Entity: Session (Remote Claude Session)

Runtime only (in memory); one live connection per active project. Not persisted.

| Field | Type | Rules |
|-------|------|-------|
| projectId | string | the project this session serves |
| connectionState | enum | `disconnected` \| `connecting` \| `connected` |
| activity | enum | `idle` \| `running` \| `awaiting-input` |
| currentInteractionId | string \| null | the InteractionRecord currently streaming, if any |

**connectionState** transitions: `disconnected` → `connecting` → `connected`; any state →
`disconnected` on drop/failure (must preserve open view + partial output, FR-004/SC-005); →
`connecting` on retry/reconnect.

**activity** transitions: `idle` → `running` (command/chat started) → `awaiting-input` (command
asked a clarifying question, FR-014) → `running` (answer supplied) → `idle` (completed) or `idle`
(cancelled, FR-015). Always derivable so the UI can show it (SC-004, Principle I/III).

## Entity: InteractionRecord

Persisted in SQLite. A command run or chat exchange tied to a spec (FR-017).

| Field | Type | Rules |
|-------|------|-------|
| id | string (uuid) | primary key |
| projectId | string | owning project |
| specId | string | the spec the interaction targeted |
| kind | enum | `command` \| `chat` |
| input | string | command name (e.g. `/speckit-plan`) or chat prompt |
| output | text | accumulated streamed output |
| status | enum | `running` \| `awaiting-input` \| `completed` \| `cancelled` \| `failed` |
| startedAt | timestamp | set when dispatched |
| endedAt | timestamp \| null | set on terminal status |

Relationships: many InteractionRecords per Spec/Project; ordered by `startedAt` to render history.

## Validation & integrity rules

- A Project's `specsPath` must resolve to an existing, readable directory at registration (FR-001).
- Spec `id`/`number` are parsed from directory names; non-conforming directories are listed but
  flagged rather than hidden.
- Artifact writes are gated by fingerprint re-check; a changed fingerprint forces `conflict`
  (FR-020, SC-007) — no silent overwrite.
- Destructive resolutions (overwrite-on-conflict, delete) require explicit confirmation (FR-023).
- InteractionRecords are append-only history; editing past records is not permitted.
