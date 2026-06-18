# Contract: REST API (non-streaming CRUD)

**Plan**: [../plan.md](../plan.md) | **Data model**: [../data-model.md](../data-model.md)

All endpoints require the single-user auth credential (FR-022). Paths are JSON over HTTP. Streaming
command/chat traffic is **not** here — see [session-ws.md](./session-ws.md).

## Projects

### `GET /api/projects`
List registered projects with live session status.
- **200** → `Project[]` where each item adds `session: { connectionState, activity }` (FR-002/003).

### `POST /api/projects`
Register a project (FR-001).
- Body: `{ name, specsPath, sessionTarget }`
- **201** → `Project`
- **400** if `specsPath` does not exist / is unreadable, or `name` is not unique.

### `POST /api/projects/{projectId}/activate`
Switch the active project; ensures its session connection is (re)established (FR-002).
- **200** → `{ project: Project, session: { connectionState, activity } }`

## Specs

### `GET /api/projects/{projectId}/specs`
List specs in the project, derived from disk (FR-005).
- Query: `?q=<search>` to filter by name/number (FR-009, SC-002).
- **200** → `Spec[]` (each with `number`, `name`, `lifecycleStatus`, and artifact summary —
  which artifacts exist, FR-010).

### `GET /api/projects/{projectId}/specs/{specId}`
Open a spec (FR-006/007/010).
- **200** → `Spec` including `artifacts[]` with `type`, `relativePath`, `exists` (content loaded
  per-artifact via the next endpoint).

### `GET /api/projects/{projectId}/specs/{specId}/artifacts/{type}`
Read one artifact's content for rendering/editing.
- **200** → `{ type, relativePath, content, fingerprint }` (fingerprint anchors conflict detection).
- **404** if the artifact does not exist (caller shows "step not yet run").

### `PUT /api/projects/{projectId}/specs/{specId}/artifacts/{type}`
Save a direct edit (FR-018).
- Body: `{ content, baselineFingerprint }`
- **200** → `{ fingerprint }` on success.
- **409 Conflict** if the on-disk fingerprint ≠ `baselineFingerprint` (FR-020, SC-007) →
  `{ error: "conflict", currentContent, currentFingerprint }`. Caller must resolve before retry;
  overwrite requires explicit confirmation (FR-023).

## Interaction history

### `GET /api/projects/{projectId}/specs/{specId}/interactions`
Return the command/chat history for a spec (FR-017).
- **200** → `InteractionRecord[]` ordered by `startedAt`.

## Error model

- All errors: `{ error: string, detail?: string }` with an appropriate HTTP status.
- **401** when the auth credential is missing/invalid (FR-022).
- **503** when an operation needs the session and it is `disconnected` (caller surfaces the state,
  preserves the view, and offers retry — FR-004/SC-005).
