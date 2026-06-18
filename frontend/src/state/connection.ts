import { create } from "zustand";
import type {
  ConnectionState,
  InteractionKind,
  InteractionStatus,
  ServerFrame,
  SessionActivity,
} from "@speckit-dashboard/shared";

export interface LiveInteraction {
  id: string;
  kind: InteractionKind | "unknown";
  input: string;
  output: string;
  status: InteractionStatus;
}

interface Clarification {
  interactionId: string;
  question: string;
  options?: string[];
}

interface SessionStore {
  connectionState: ConnectionState;
  activity: SessionActivity;
  currentInteractionId: string | null;
  interactions: LiveInteraction[];
  clarification: Clarification | null;
  /** Bumped whenever the session reports an artifact changed on disk (FR-016). */
  fileChangeTick: number;
  lastError: string | null;
  /** Inputs we've sent but not yet matched to a server interaction id. */
  pendingInputs: { kind: InteractionKind; input: string }[];

  reset: () => void;
  noteSent: (kind: InteractionKind, input: string) => void;
  applyFrame: (frame: ServerFrame) => void;
}

const initial = {
  connectionState: "connecting" as ConnectionState,
  activity: "idle" as SessionActivity,
  currentInteractionId: null,
  interactions: [] as LiveInteraction[],
  clarification: null as Clarification | null,
  fileChangeTick: 0,
  lastError: null as string | null,
  pendingInputs: [] as { kind: InteractionKind; input: string }[],
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initial,

  reset: () => set({ ...initial }),

  noteSent: (kind, input) => set((s) => ({ pendingInputs: [...s.pendingInputs, { kind, input }] })),

  applyFrame: (frame) =>
    set((s) => {
      switch (frame.type) {
        case "status": {
          const next: Partial<SessionStore> = {
            connectionState: frame.connectionState,
            activity: frame.activity,
            currentInteractionId: frame.interactionId ?? null,
          };
          // Associate a freshly-started interaction id with the input we queued.
          if (
            frame.interactionId &&
            !s.interactions.some((i) => i.id === frame.interactionId) &&
            s.pendingInputs.length > 0
          ) {
            const [pending, ...rest] = s.pendingInputs;
            next.pendingInputs = rest;
            next.interactions = [
              ...s.interactions,
              {
                id: frame.interactionId,
                kind: pending!.kind,
                input: pending!.input,
                output: "",
                status: "running",
              },
            ];
          }
          return next;
        }
        case "output":
          return {
            interactions: upsert(s.interactions, frame.interactionId, (i) => ({
              ...i,
              output: i.output + frame.chunk,
            })),
          };
        case "clarification":
          return {
            clarification: {
              interactionId: frame.interactionId,
              question: frame.question,
              options: frame.options,
            },
            interactions: upsert(s.interactions, frame.interactionId, (i) => ({
              ...i,
              status: "awaiting-input",
            })),
          };
        case "interaction_end":
          return {
            clarification:
              s.clarification?.interactionId === frame.interactionId ? null : s.clarification,
            interactions: upsert(s.interactions, frame.interactionId, (i) => ({
              ...i,
              status: frame.status,
            })),
          };
        case "file_changed":
          return { fileChangeTick: s.fileChangeTick + 1 };
        case "error":
          return { lastError: frame.detail ?? frame.error };
        default:
          return {};
      }
    }),
}));

function upsert(
  list: LiveInteraction[],
  id: string,
  update: (i: LiveInteraction) => LiveInteraction,
): LiveInteraction[] {
  if (!list.some((i) => i.id === id)) {
    list = [...list, { id, kind: "unknown", input: "", output: "", status: "running" }];
  }
  return list.map((i) => (i.id === id ? update(i) : i));
}
