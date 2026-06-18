/**
 * Ordered streamed-output accumulator (T035).
 *
 * The remote session emits output as a sequence of chunks. The gateway forwards
 * each chunk to the client immediately (live streaming) while this accumulator
 * keeps the full ordered text so it can be persisted to the InteractionRecord
 * (FR-013, FR-017). Chunks may carry an optional sequence number; when present,
 * out-of-order arrivals are buffered and flushed in order.
 */
export class OutputAccumulator {
  private text = "";
  private nextSeq = 0;
  private readonly pending = new Map<number, string>();

  /** Append a chunk. Returns the newly appended text (in order), or "" if buffered. */
  append(chunk: string, seq?: number): string {
    if (seq === undefined) {
      this.text += chunk;
      return chunk;
    }
    this.pending.set(seq, chunk);
    let appended = "";
    while (this.pending.has(this.nextSeq)) {
      const next = this.pending.get(this.nextSeq)!;
      this.pending.delete(this.nextSeq);
      this.text += next;
      appended += next;
      this.nextSeq += 1;
    }
    return appended;
  }

  /** The full accumulated text so far. */
  get value(): string {
    return this.text;
  }

  /** True if any sequenced chunks are still awaiting earlier ones. */
  get hasPending(): boolean {
    return this.pending.size > 0;
  }
}
