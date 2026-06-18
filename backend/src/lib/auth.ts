import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Single-user auth gate (FR-022). Accepts the configured token via either the
 * `Authorization: Bearer <token>` header or a `token` query parameter (the
 * latter supports the WebSocket upgrade in US2). Replies 401 on mismatch.
 */
export function createAuthGate(token: string) {
  return async function authGate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const header = req.headers.authorization;
    const fromHeader = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const query = req.query as Record<string, unknown> | undefined;
    const fromQuery = typeof query?.token === "string" ? query.token : undefined;
    const presented = fromHeader ?? fromQuery;

    if (presented !== token) {
      await reply.code(401).send({ error: "unauthorized" });
    }
  };
}
