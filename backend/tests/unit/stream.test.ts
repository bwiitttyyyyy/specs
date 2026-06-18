import { describe, expect, it } from "vitest";
import { OutputAccumulator } from "../../src/lib/stream.js";

describe("OutputAccumulator (T031)", () => {
  it("appends unsequenced chunks in arrival order", () => {
    const acc = new OutputAccumulator();
    expect(acc.append("a")).toBe("a");
    expect(acc.append("b")).toBe("b");
    expect(acc.value).toBe("ab");
  });

  it("reorders sequenced chunks and flushes when contiguous", () => {
    const acc = new OutputAccumulator();
    expect(acc.append("c", 2)).toBe(""); // buffered, waiting for 0,1
    expect(acc.hasPending).toBe(true);
    expect(acc.append("a", 0)).toBe("a");
    expect(acc.append("b", 1)).toBe("bc"); // 1 then buffered 2 flush
    expect(acc.value).toBe("abc");
    expect(acc.hasPending).toBe(false);
  });
});
