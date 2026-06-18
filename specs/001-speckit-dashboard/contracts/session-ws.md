# Contract: Session WebSocket (streaming + clarifying input)

**Plan**: [../plan.md](../plan.md) | **Data model**: [../data-model.md](../data-model.md)

One WebSocket per active spec workspace carries bidirectional session traffic. Connection requires
the single-user auth credential (FR-022). All frames are JSON: `{ type, ...payload }`.

## Connection lifecycle

- Client opens: `GET /ws?projectId=<id>&specId=<id>` (upgrade).
- Server immediately emits a `status` frame with the current `connectionState`/`activity` so the UI
  can render it on attach (FR-003, Principle I).
- On session drop, server emits `status { connectionState: "disconnected" }`; the client keeps the
  spec view and any partial `output` already received (FR-004, SC-005) and may send `reconnect`.

## Client → Server frames

| type | payload | purpose |
|------|---------|---------|
| `run_command` | `{ command, specId }` | run a speckit slash command against the spec (FR-011) |
| `chat` | `{ message, specId }` | free-form chat scoped to the spec (FR-012) |
| `answer` | `{ interactionId, answer }` | reply to a clarifying question (FR-014) |
| `cancel` | `{ interactionId }` | stop a running command/chat (FR-015) |
| `reconnect` | `{}` | re-establish a dropped session (FR-004) |

`command` MUST be one of the speckit commands the project exposes (e.g. `/speckit-specify`,
`/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze`, `/speckit-checklist`,
`/speckit-implement`).

## Server → Client frames

| type | payload | purpose |
|------|---------|---------|
| `status` | `{ connectionState, activity, interactionId? }` | session state machine updates (FR-003, SC-004) |
| `output` | `{ interactionId, chunk }` | streamed output chunk; appended in order (FR-013, SC-004) |
| `clarification` | `{ interactionId, question, options? }` | command is awaiting user input (FR-014) → activity becomes `awaiting-input` |
| `file_changed` | `{ specId, artifactType }` | an artifact changed on disk; client refreshes/signals stale (FR-016) |
| `interaction_end` | `{ interactionId, status }` | terminal status: `completed` \| `cancelled` \| `failed` |
| `error` | `{ interactionId?, error, detail? }` | recoverable error; view preserved |

## Ordering & guarantees

- `output` chunks for a given `interactionId` arrive in order and are concatenated client-side; the
  full text is also persisted to the InteractionRecord (FR-017).
- First `output` or `status:running` frame MUST follow a `run_command`/`chat` within ≤2s (SC-004).
- A `clarification` frame pauses the interaction until a matching `answer`; until then the UI shows
  "waiting on you" (FR-014, Principle I).
- After `file_changed`, if the user has unsaved edits to that artifact, the client enters the
  conflict path rather than auto-replacing buffer contents (FR-020, SC-007).

## Contract tests (Principle IV)

- `run_command` → receives `status:running` then ≥1 `output` then `interaction_end`.
- Clarifying flow: `run_command` → `clarification` → `answer` → resumes → `interaction_end`.
- `cancel` mid-stream → `interaction_end{status:"cancelled"}`, session returns to `idle`.
- Forced disconnect mid-stream → `status:disconnected`; prior `output` retained; `reconnect` works.
