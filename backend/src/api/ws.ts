import fastifyWebsocket from "@fastify/websocket";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import type { ClientFrame, ServerFrame } from "@speckit-dashboard/shared";
import type { InteractionRepository } from "../models/interaction.js";
import type { ProjectRegistry } from "../services/projects/registry.js";
import type { SessionManager } from "../services/sessions/manager.js";
import { InteractionController } from "../services/commands/runner.js";
import { SpecWatcher } from "../services/specs/watch.js";

export interface WsDeps {
  registry: ProjectRegistry;
  sessions: SessionManager;
  interactions: InteractionRepository;
  /** Single-user auth credential (FR-022); checked inside the handler. */
  authToken: string;
}

/** WebSocket close code for an auth failure (policy violation). */
const WS_POLICY_VIOLATION = 1008;

/** Register the per-spec session WebSocket gateway (T039, contracts/session-ws.md). */
export function registerWebSocket(app: FastifyInstance, deps: WsDeps): void {
  // Track open sockets so shutdown can terminate them before fastify closes the
  // server (otherwise wss.close() blocks waiting on un-acked close handshakes).
  const openSockets = new Set<WebSocket>();
  app.addHook("preClose", async () => {
    for (const s of openSockets) s.terminate();
    openSockets.clear();
    // Drop lingering HTTP-level connections too — notably rejected (401) upgrade
    // requests, which never become tracked WebSocket clients but still hold a
    // socket open and would otherwise block server close.
    app.server.closeAllConnections?.();
  });

  void app.register(async (instance) => {
    await instance.register(fastifyWebsocket);

    instance.get("/ws", { websocket: true }, async (socket: WebSocket, req: FastifyRequest) => {
      openSockets.add(socket);
      const query = req.query as { projectId?: string; specId?: string; token?: string };
      const send = (frame: ServerFrame): void => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(frame));
      };

      // Authenticate the connection (FR-022).
      if (query.token !== deps.authToken) {
        send({ type: "error", error: "unauthorized" });
        openSockets.delete(socket);
        socket.close(WS_POLICY_VIOLATION, "unauthorized");
        return;
      }

      const project = query.projectId ? deps.registry.get(query.projectId) : undefined;
      const specId = query.specId;
      if (!project || !specId) {
        send({ type: "error", error: "bad_request", detail: "projectId and specId required" });
        socket.close();
        return;
      }

      let controller: InteractionController | null = null;
      let unsubscribe: (() => void) | null = null;
      const watcher = new SpecWatcher(project.specsPath, specId);

      try {
        const session = await deps.sessions.getConnected(project.id, project.sessionTarget);
        unsubscribe = session.onStateChange((state) =>
          send({
            type: "status",
            ...state,
            interactionId: state.currentInteractionId ?? undefined,
          }),
        );
        controller = new InteractionController(session, deps.interactions, send, {
          projectId: project.id,
          specId,
        });
        // Initial status so the UI can render on attach (FR-003).
        send({ type: "status", ...session.state });

        watcher.start((artifactType) => send({ type: "file_changed", specId, artifactType }));
      } catch (err) {
        send({
          type: "status",
          connectionState: "disconnected",
          activity: "idle",
        });
        send({ type: "error", error: "session_unavailable", detail: (err as Error).message });
      }

      socket.on("message", (raw: Buffer) => {
        let frame: ClientFrame;
        try {
          frame = JSON.parse(raw.toString()) as ClientFrame;
        } catch {
          send({ type: "error", error: "bad_frame" });
          return;
        }
        if (!controller) {
          send({ type: "error", error: "session_unavailable" });
          return;
        }
        switch (frame.type) {
          case "run_command":
            controller.start("command", frame.command);
            break;
          case "chat":
            controller.start("chat", frame.message);
            break;
          case "answer":
            controller.answer(frame.interactionId, frame.answer);
            break;
          case "cancel":
            controller.cancel(frame.interactionId);
            break;
          case "reconnect":
            void deps.sessions
              .getConnected(project.id, project.sessionTarget)
              .then((s) => send({ type: "status", ...s.state }))
              .catch((e) =>
                send({ type: "error", error: "session_unavailable", detail: (e as Error).message }),
              );
            break;
        }
      });

      socket.on("close", () => {
        openSockets.delete(socket);
        unsubscribe?.();
        watcher.stop();
      });
    });
  });
}
