/**
 * Shared types for the Speckit Web Dashboard (T008).
 *
 * These types are the contract between the backend service and the React
 * frontend. They mirror the entities in `specs/001-speckit-dashboard/data-model.md`
 * and the wire schemas in `contracts/rest-api.md` / `contracts/session-ws.md`.
 */

// ---------------------------------------------------------------------------
// Project (Workspace) — dashboard-local, persisted
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  /** Absolute path to the project's `specs/` directory. */
  specsPath: string;
  /** Identifier/endpoint used to attach to the project's remote Claude session. */
  sessionTarget: string;
  createdAt: string;
  lastActiveAt: string;
}

export type NewProject = Pick<Project, "name" | "specsPath" | "sessionTarget">;

// ---------------------------------------------------------------------------
// Spec (Feature) — derived from disk
// ---------------------------------------------------------------------------

/** Lifecycle stages, ordered earliest → latest. */
export const LIFECYCLE_STAGES = [
  "specified",
  "clarified",
  "planned",
  "tasks-generated",
  "implementing",
  "reviewed",
] as const;

export type LifecycleStatus = (typeof LIFECYCLE_STAGES)[number];

export type ArtifactType =
  | "spec"
  | "plan"
  | "tasks"
  | "research"
  | "data-model"
  | "quickstart"
  | "checklist"
  | "contract"
  | "other";

/** Summary of an artifact as listed alongside a spec (no content). */
export interface ArtifactSummary {
  type: ArtifactType;
  relativePath: string;
  exists: boolean;
}

/** Full artifact content, loaded on open. */
export interface Artifact extends ArtifactSummary {
  content: string;
  /** content hash + mtime, the baseline for conflict detection (US3). */
  fingerprint: string;
}

export interface Spec {
  id: string;
  number: string;
  name: string;
  projectId: string;
  lifecycleStatus: LifecycleStatus;
  artifacts: ArtifactSummary[];
  /** True when the directory name does not match the expected `NNN-name` form. */
  malformed: boolean;
}

// ---------------------------------------------------------------------------
// Session (Remote Claude Session) — runtime only (US2)
// ---------------------------------------------------------------------------

export type ConnectionState = "disconnected" | "connecting" | "connected";
export type SessionActivity = "idle" | "running" | "awaiting-input";

export interface SessionState {
  connectionState: ConnectionState;
  activity: SessionActivity;
  currentInteractionId?: string | null;
}

// ---------------------------------------------------------------------------
// InteractionRecord — dashboard-local, persisted (US2)
// ---------------------------------------------------------------------------

export type InteractionKind = "command" | "chat";
export type InteractionStatus = "running" | "awaiting-input" | "completed" | "cancelled" | "failed";

export interface InteractionRecord {
  id: string;
  projectId: string;
  specId: string;
  kind: InteractionKind;
  input: string;
  output: string;
  status: InteractionStatus;
  startedAt: string;
  endedAt: string | null;
}

// ---------------------------------------------------------------------------
// REST response shapes (contracts/rest-api.md)
// ---------------------------------------------------------------------------

export interface ProjectWithSession extends Project {
  session: SessionState;
}

export interface ApiError {
  error: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// WebSocket frames (contracts/session-ws.md) — US2
// ---------------------------------------------------------------------------

export type ClientFrame =
  | { type: "run_command"; command: string; specId: string }
  | { type: "chat"; message: string; specId: string }
  | { type: "answer"; interactionId: string; answer: string }
  | { type: "cancel"; interactionId: string }
  | { type: "reconnect" };

export type ServerFrame =
  | {
      type: "status";
      connectionState: ConnectionState;
      activity: SessionActivity;
      interactionId?: string;
    }
  | { type: "output"; interactionId: string; chunk: string }
  | { type: "clarification"; interactionId: string; question: string; options?: string[] }
  | { type: "file_changed"; specId: string; artifactType: ArtifactType }
  | { type: "interaction_end"; interactionId: string; status: InteractionStatus }
  | { type: "error"; interactionId?: string; error: string; detail?: string };
