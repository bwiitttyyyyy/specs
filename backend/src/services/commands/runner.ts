import { randomUUID } from "node:crypto";
import type { InteractionKind, InteractionRecord, ServerFrame } from "@speckit-dashboard/shared";
import type { InteractionRepository } from "../../models/interaction.js";
import { OutputAccumulator } from "../../lib/stream.js";
import type { Session } from "../sessions/session.js";

export type FrameSink = (frame: ServerFrame) => void;

/**
 * Drives one spec's interactions over a Session (T037): dispatches commands/chat,
 * streams output to the client as frames, handles clarification + cancel, and
 * persists each interaction to history (T040, FR-011–FR-017).
 */
export class InteractionController {
  private readonly accumulators = new Map<string, OutputAccumulator>();

  constructor(
    private readonly session: Session,
    private readonly repo: InteractionRepository,
    private readonly sink: FrameSink,
    private readonly ctx: { projectId: string; specId: string },
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  start(kind: InteractionKind, input: string): string {
    const id = randomUUID();
    const record: InteractionRecord = {
      id,
      projectId: this.ctx.projectId,
      specId: this.ctx.specId,
      kind,
      input,
      output: "",
      status: "running",
      startedAt: this.now(),
      endedAt: null,
    };
    this.repo.upsert(record);
    this.accumulators.set(id, new OutputAccumulator());

    this.session.run(id, kind, input, (event) => {
      switch (event.kind) {
        case "output": {
          this.accumulators.get(id)?.append(event.chunk);
          this.persist(id, { output: this.accumulators.get(id)?.value });
          this.sink({ type: "output", interactionId: id, chunk: event.chunk });
          break;
        }
        case "clarification": {
          this.persist(id, { status: "awaiting-input" });
          this.sink({
            type: "clarification",
            interactionId: id,
            question: event.question,
            options: event.options,
          });
          break;
        }
        case "end": {
          this.persist(id, { status: event.status, endedAt: this.now() });
          this.accumulators.delete(id);
          this.sink({ type: "interaction_end", interactionId: id, status: event.status });
          break;
        }
      }
    });

    return id;
  }

  answer(interactionId: string, answer: string): void {
    this.session.answer(interactionId, answer);
  }

  cancel(interactionId: string): void {
    this.session.cancel(interactionId);
  }

  private persist(id: string, patch: Partial<InteractionRecord>): void {
    const existing = this.repo.get(id);
    if (!existing) return;
    this.repo.upsert({ ...existing, ...patch });
  }
}
