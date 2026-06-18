import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArtifactSummary } from "@speckit-dashboard/shared";
import { api } from "../services/api";
import { ArtifactEditor } from "../components/ArtifactEditor";
import { SessionPanel } from "../components/SessionPanel";
import { EmptyState, ErrorBanner, Spinner } from "../components/ui/primitives";
import { useSpecSession } from "../services/ws";
import { useSessionStore } from "../state/connection";

/** Spec workspace: artifact reader (left) + remote-session panel (right). */
export function SpecWorkspace({ projectId, specId }: { projectId: string; specId: string }) {
  const queryClient = useQueryClient();
  const session = useSpecSession(projectId, specId);
  const fileChangeTick = useSessionStore((s) => s.fileChangeTick);

  const {
    data: spec,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["spec", projectId, specId],
    queryFn: () => api.getSpec(projectId, specId),
  });

  const [active, setActive] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (spec) {
      const first = spec.artifacts.find((a) => a.exists);
      setActive((cur) => cur ?? (first ? first.relativePath : null));
    }
  }, [spec]);

  // Warn before leaving the page/tab with unsaved edits (FR-019).
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent): void => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Guard in-app navigation between artifacts when there are unsaved edits (FR-019).
  const selectArtifact = (relativePath: string): void => {
    if (
      dirty &&
      !window.confirm("You have unsaved changes that will be lost. Switch artifact anyway?")
    ) {
      return;
    }
    setDirty(false);
    setActive(relativePath);
  };

  // When the session reports a file changed on disk, refresh the spec + artifacts (FR-016).
  useEffect(() => {
    if (fileChangeTick > 0) {
      void queryClient.invalidateQueries({ queryKey: ["spec", projectId, specId] });
      void queryClient.invalidateQueries({ queryKey: ["artifact", projectId, specId] });
    }
  }, [fileChangeTick, queryClient, projectId, specId]);

  if (isLoading)
    return (
      <div className="p-6">
        <Spinner label="Loading spec" />
      </div>
    );
  if (error)
    return (
      <div className="p-6">
        <ErrorBanner message={(error as Error).message} />
      </div>
    );
  if (!spec) return null;

  const activeArtifact = spec.artifacts.find((a) => a.relativePath === active);

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line px-6 py-4">
          <h2 className="text-xl font-bold">{spec.name}</h2>
          <p className="font-mono text-xs text-muted">{spec.id}</p>
        </header>

        <nav className="flex flex-wrap gap-1 border-b border-line px-4 py-2" aria-label="Artifacts">
          {spec.artifacts.map((a: ArtifactSummary) => (
            <button
              key={a.relativePath}
              disabled={!a.exists}
              onClick={() => selectArtifact(a.relativePath)}
              title={a.exists ? a.relativePath : "Step not yet run"}
              className={`rounded-md px-3 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:text-slate-300 ${
                a.relativePath === active ? "bg-brand text-white" : "hover:bg-canvas"
              }`}
            >
              {a.relativePath}
              {!a.exists && <span className="ml-1 text-xs">·not run</span>}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeArtifact ? (
            <ArtifactEditor
              key={activeArtifact.relativePath}
              projectId={projectId}
              spec={spec}
              type={activeArtifact.type}
              relativePath={activeArtifact.relativePath}
              onDirtyChange={setDirty}
            />
          ) : (
            <EmptyState title="No artifacts yet">
              This spec has no generated artifacts to display.
            </EmptyState>
          )}
        </div>
      </section>

      <aside aria-label="Remote session" className="w-96 shrink-0">
        <SessionPanel session={session} />
      </aside>
    </div>
  );
}
