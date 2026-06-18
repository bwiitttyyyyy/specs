import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import { createAuthGate } from "../lib/auth.js";
import { createProjectRepository } from "../models/project.js";
import { createInteractionRepository, type InteractionRepository } from "../models/interaction.js";
import { ProjectRegistry } from "../services/projects/registry.js";
import { SessionManager } from "../services/sessions/manager.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerSpecRoutes } from "./routes/specs.js";
import { registerInteractionRoutes } from "./routes/interactions.js";
import { registerWebSocket } from "./ws.js";

export interface BuildOptions {
  /** Override the registry (used by tests). */
  registry?: ProjectRegistry;
  /** Override the session manager (used by tests to inject a mock adapter). */
  sessions?: SessionManager;
  /** Override the interaction repository (used by tests). */
  interactions?: InteractionRepository;
}

/** Build the Fastify app with auth gate, error model, and routes (T013). */
export function buildServer(config: Config, opts: BuildOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });

  // Permissive CORS for the local SPA dev origin; auth still gates every request.
  app.addHook("onRequest", async (req, reply) => {
    reply.header("access-control-allow-origin", "*");
    reply.header("access-control-allow-headers", "authorization,content-type");
    reply.header("access-control-allow-methods", "GET,POST,PUT,OPTIONS");
    if (req.method === "OPTIONS") {
      await reply.code(204).send();
    }
  });

  // Single-user auth gate on every /api route (FR-022).
  const authGate = createAuthGate(config.authToken);
  app.addHook("onRequest", async (req, reply) => {
    if (req.method === "OPTIONS") return;
    if (req.url === "/health") return;
    // The WebSocket gateway authenticates inside its handler (rejecting via an
    // HTTP 401 on an upgrade request leaves a half-open socket that blocks close).
    if (req.url.startsWith("/ws")) return;
    await authGate(req, reply);
  });

  // Shared error model: { error, detail }.
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    void reply
      .code(status)
      .send({ error: status === 500 ? "internal_error" : err.name, detail: err.message });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: "not_found" });
  });

  app.get("/health", async () => ({ status: "ok" }));

  const registry = opts.registry ?? new ProjectRegistry(createProjectRepository(config.dataDir));
  const interactions = opts.interactions ?? createInteractionRepository(config.dataDir);
  const sessions = opts.sessions ?? SessionManager.create(config.adapterMode);

  registerProjectRoutes(app, registry);
  registerSpecRoutes(app, registry);
  registerInteractionRoutes(app, interactions);
  registerWebSocket(app, { registry, sessions, interactions, authToken: config.authToken });

  return app;
}
