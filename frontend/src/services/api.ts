import type {
  Artifact,
  ArtifactType,
  NewProject,
  Project,
  ProjectWithSession,
  Spec,
} from "@speckit-dashboard/shared";

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://127.0.0.1:4317";

export function getToken(): string {
  return localStorage.getItem("speckit-token") ?? "dev-token";
}

export function setToken(token: string): void {
  localStorage.setItem("speckit-token", token);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${getToken()}`,
      // Only declare a JSON body when one is actually sent — Fastify rejects an
      // empty body when content-type is application/json (e.g. POST /activate).
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    let body: Record<string, unknown> | undefined;
    try {
      body = (await res.json()) as Record<string, unknown>;
      detail = (body.detail as string) ?? (body.error as string) ?? detail;
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, detail, body);
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Parsed error body — carries currentContent/currentFingerprint on a 409. */
    readonly body?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ConflictBody {
  currentContent: string;
  currentFingerprint: string;
}

export const api = {
  listProjects: () => request<ProjectWithSession[]>("/api/projects"),
  createProject: (body: NewProject) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  activateProject: (id: string) =>
    request<{ project: Project }>(`/api/projects/${id}/activate`, { method: "POST" }),
  listSpecs: (projectId: string, q?: string) =>
    request<Spec[]>(`/api/projects/${projectId}/specs${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createSpec: (projectId: string, body: { name: string; description: string }) =>
    request<Spec>(`/api/projects/${projectId}/specs`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSpec: (projectId: string, specId: string) =>
    request<Spec>(`/api/projects/${projectId}/specs/${specId}`),
  getArtifact: (projectId: string, specId: string, type: ArtifactType, path?: string) =>
    request<Artifact>(
      `/api/projects/${projectId}/specs/${specId}/artifacts/${type}${
        path ? `?path=${encodeURIComponent(path)}` : ""
      }`,
    ),
  updateArtifact: (
    projectId: string,
    specId: string,
    type: ArtifactType,
    body: { content: string; baselineFingerprint: string },
    path?: string,
  ) =>
    request<{ fingerprint: string }>(
      `/api/projects/${projectId}/specs/${specId}/artifacts/${type}${
        path ? `?path=${encodeURIComponent(path)}` : ""
      }`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
};
