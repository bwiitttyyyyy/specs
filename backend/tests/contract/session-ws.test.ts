import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import type { FastifyInstance } from "fastify";
import type { Project, ServerFrame } from "@speckit-dashboard/shared";
import { buildServer } from "../../src/api/server.js";
import { ProjectRegistry } from "../../src/services/projects/registry.js";
import { JsonRepository } from "../../src/models/store.js";

let app: FastifyInstance;
let tmp: string;
let port: number;
let projectId: string;
const SPEC_ID = "001-demo-feature";

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), "speckit-ws-"));
  const specsPath = join(tmp, "specs");
  mkdirSync(join(specsPath, SPEC_ID), { recursive: true });
  writeFileSync(join(specsPath, SPEC_ID, "spec.md"), "# Feature Specification: Demo\n");

  const registry = new ProjectRegistry(new JsonRepository<Project>(join(tmp, "data"), "projects"));
  projectId = registry.register(
    { name: "Demo", specsPath, sessionTarget: "local" },
    new Date().toISOString(),
  ).id;

  app = buildServer(
    {
      port: 0,
      host: "127.0.0.1",
      authToken: "test-token",
      dataDir: join(tmp, "data"),
      adapterMode: "mock",
    },
    { registry },
  );
  await app.listen({ port: 0, host: "127.0.0.1" });
  port = (app.server.address() as AddressInfo).port;
});

afterAll(async () => {
  await app.close();
  rmSync(tmp, { recursive: true, force: true });
});

function connect(): WebSocket {
  return new WebSocket(
    `ws://127.0.0.1:${port}/ws?projectId=${projectId}&specId=${SPEC_ID}&token=test-token`,
  );
}

/** Open a socket, run `interact`, and collect frames until `done` is satisfied. */
function session(
  interact: (ws: WebSocket, frames: ServerFrame[]) => void,
  done: (frames: ServerFrame[]) => boolean,
): Promise<ServerFrame[]> {
  return new Promise((resolve, reject) => {
    const ws = connect();
    const frames: ServerFrame[] = [];
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`timeout; frames=${JSON.stringify(frames)}`));
    }, 4000);
    ws.on("message", (raw) => {
      frames.push(JSON.parse(raw.toString()) as ServerFrame);
      interact(ws, frames);
      if (done(frames)) {
        clearTimeout(timer);
        ws.close();
        resolve(frames);
      }
    });
    ws.on("error", reject);
  });
}

describe("session WebSocket gateway (T033)", () => {
  it("rejects an unauthenticated connection with an error frame + policy-violation close (FR-022)", async () => {
    const result = await new Promise<{ frame?: ServerFrame; code: number }>((resolve, reject) => {
      const ws = new WebSocket(
        `ws://127.0.0.1:${port}/ws?projectId=${projectId}&specId=${SPEC_ID}`,
      );
      let frame: ServerFrame | undefined;
      ws.on("message", (raw) => {
        frame = JSON.parse(raw.toString()) as ServerFrame;
      });
      ws.on("close", (code) => resolve({ frame, code }));
      ws.on("error", reject);
    });
    expect(result.frame && result.frame.type === "error" && result.frame.error).toBe(
      "unauthorized",
    );
    expect(result.code).toBe(1008);
  });

  it("run_command → status:running → output → interaction_end:completed", async () => {
    let sent = false;
    const frames = await session(
      (ws, fs) => {
        if (!sent && fs.some((f) => f.type === "status")) {
          sent = true;
          ws.send(
            JSON.stringify({ type: "run_command", command: "/speckit-plan", specId: SPEC_ID }),
          );
        }
      },
      (fs) => fs.some((f) => f.type === "interaction_end"),
    );
    expect(frames.some((f) => f.type === "status" && f.activity === "running")).toBe(true);
    expect(frames.some((f) => f.type === "output")).toBe(true);
    const end = frames.find((f) => f.type === "interaction_end");
    expect(end && end.type === "interaction_end" && end.status).toBe("completed");
  });

  it("clarification → answer → interaction_end:completed (FR-014)", async () => {
    let started = false;
    const frames = await session(
      (ws, fs) => {
        if (!started && fs.some((f) => f.type === "status")) {
          started = true;
          ws.send(
            JSON.stringify({
              type: "run_command",
              command: "/speckit-clarify ASK",
              specId: SPEC_ID,
            }),
          );
        }
        const clar = fs.find((f) => f.type === "clarification");
        if (clar && clar.type === "clarification") {
          ws.send(
            JSON.stringify({ type: "answer", interactionId: clar.interactionId, answer: "A" }),
          );
        }
      },
      (fs) => fs.some((f) => f.type === "interaction_end"),
    );
    expect(frames.some((f) => f.type === "clarification")).toBe(true);
    expect(frames.some((f) => f.type === "status" && f.activity === "awaiting-input")).toBe(true);
    const end = frames.find((f) => f.type === "interaction_end");
    expect(end && end.type === "interaction_end" && end.status).toBe("completed");
  });

  it("cancel → interaction_end:cancelled (FR-015)", async () => {
    let started = false;
    const frames = await session(
      (ws, fs) => {
        if (!started && fs.some((f) => f.type === "status")) {
          started = true;
          ws.send(
            JSON.stringify({ type: "run_command", command: "/speckit-plan ASK", specId: SPEC_ID }),
          );
        }
        const clar = fs.find((f) => f.type === "clarification");
        if (clar && clar.type === "clarification") {
          ws.send(JSON.stringify({ type: "cancel", interactionId: clar.interactionId }));
        }
      },
      (fs) => fs.some((f) => f.type === "interaction_end"),
    );
    const end = frames.find((f) => f.type === "interaction_end");
    expect(end && end.type === "interaction_end" && end.status).toBe("cancelled");
  });
});
