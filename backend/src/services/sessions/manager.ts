import { MockSessionAdapter, type SessionAdapter } from "./adapter.js";
import { ClaudeSessionAdapter } from "./claude-adapter.js";
import { Session } from "./session.js";

export type AdapterMode = "mock" | "claude";

export type AdapterFactory = (opts: { sessionTarget: string; specsPath: string }) => SessionAdapter;

function defaultFactory(mode: AdapterMode): AdapterFactory {
  return ({ sessionTarget, specsPath }) =>
    mode === "claude"
      ? new ClaudeSessionAdapter(specsPath, sessionTarget)
      : new MockSessionAdapter();
}

/**
 * One live Session per project (the spec's "one session per active project").
 * Sessions are created lazily and reused across spec channels of the same project.
 */
export class SessionManager {
  private readonly sessions = new Map<string, Session>();

  constructor(private readonly factory: AdapterFactory) {}

  static create(mode: AdapterMode): SessionManager {
    return new SessionManager(defaultFactory(mode));
  }

  /** Get (creating + connecting if needed) the session for a project. */
  async getConnected(project: {
    id: string;
    sessionTarget: string;
    specsPath: string;
  }): Promise<Session> {
    let session = this.sessions.get(project.id);
    if (!session) {
      session = new Session(
        this.factory({ sessionTarget: project.sessionTarget, specsPath: project.specsPath }),
      );
      this.sessions.set(project.id, session);
    }
    await session.connect();
    return session;
  }

  get(projectId: string): Session | undefined {
    return this.sessions.get(projectId);
  }
}
