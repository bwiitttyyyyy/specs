import { MockSessionAdapter, type SessionAdapter } from "./adapter.js";
import { ClaudeSessionAdapter } from "./claude-adapter.js";
import { Session } from "./session.js";

export type AdapterMode = "mock" | "claude";

export type AdapterFactory = (sessionTarget: string) => SessionAdapter;

function defaultFactory(mode: AdapterMode): AdapterFactory {
  return (sessionTarget: string) =>
    mode === "claude" ? new ClaudeSessionAdapter(sessionTarget) : new MockSessionAdapter();
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
  async getConnected(projectId: string, sessionTarget: string): Promise<Session> {
    let session = this.sessions.get(projectId);
    if (!session) {
      session = new Session(this.factory(sessionTarget));
      this.sessions.set(projectId, session);
    }
    await session.connect();
    return session;
  }

  get(projectId: string): Session | undefined {
    return this.sessions.get(projectId);
  }
}
