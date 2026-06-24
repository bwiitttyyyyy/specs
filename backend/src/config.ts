import { resolve } from "node:path";

/** Runtime configuration, sourced from environment with safe defaults. */
export interface Config {
  port: number;
  host: string;
  /** Single-user auth credential (FR-022). */
  authToken: string;
  /** Directory for dashboard-local persisted state (project registry). */
  dataDir: string;
  /** Which remote-session adapter to use: "mock" (default here) or "claude". */
  adapterMode: "mock" | "claude";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const authToken = env.SPECKIT_DASHBOARD_TOKEN ?? "dev-token";
  if (!env.SPECKIT_DASHBOARD_TOKEN) {
    console.warn(
      "[config] SPECKIT_DASHBOARD_TOKEN not set; using insecure default 'dev-token'. Set it in production.",
    );
  }
  return {
    port: Number(env.PORT ?? 4317),
    host: env.HOST ?? "127.0.0.1",
    authToken,
    dataDir: resolve(env.SPECKIT_DASHBOARD_DATA ?? "./data"),
    adapterMode: (() => {
      if (env.SPECKIT_SESSION_ADAPTER === "mock") return "mock";
      if (env.SPECKIT_SESSION_ADAPTER === "claude" || env.ANTHROPIC_API_KEY) return "claude";
      return "mock";
    })(),
  };
}
