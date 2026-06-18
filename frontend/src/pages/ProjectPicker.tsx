import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectWithSession } from "@speckit-dashboard/shared";
import { api } from "../services/api";
import { Button, EmptyState, ErrorBanner, Spinner } from "../components/ui/primitives";

/** Select an active project, with per-project session status (FR-002/003). */
export function ProjectPicker({ onSelect }: { onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const {
    data: projects,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });
  const [form, setForm] = useState({ name: "", specsPath: "", sessionTarget: "" });
  const [showForm, setShowForm] = useState(false);

  const create = useMutation({
    mutationFn: () => api.createProject(form),
    onSuccess: () => {
      setForm({ name: "", specsPath: "", sessionTarget: "" });
      setShowForm(false);
      void qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Projects</h1>
      <p className="mt-1 text-sm text-muted">Select a project to browse its specs.</p>

      <div className="mt-6 space-y-2">
        {isLoading && <Spinner label="Loading projects" />}
        {error && <ErrorBanner message={(error as Error).message} />}
        {projects?.length === 0 && (
          <EmptyState title="No projects yet">Register one below to get started.</EmptyState>
        )}
        {projects?.map((p: ProjectWithSession) => (
          <button
            key={p.id}
            onClick={() => {
              void api.activateProject(p.id);
              onSelect(p.id);
            }}
            className="flex w-full items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-left transition-shadow hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            <span>
              <span className="font-medium">{p.name}</span>
              <span className="block text-xs text-muted">{p.specsPath}</span>
            </span>
            <SessionDot state={p.session.connectionState} />
          </button>
        ))}
      </div>

      <div className="mt-6">
        {showForm ? (
          <form
            className="space-y-3 rounded-lg border border-line bg-surface p-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            {(["name", "specsPath", "sessionTarget"] as const).map((field) => (
              <label key={field} className="block text-sm">
                <span className="text-muted">{field}</span>
                <input
                  required
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </label>
            ))}
            {create.error && <ErrorBanner message={(create.error as Error).message} />}
            <div className="flex gap-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Registering…" : "Register"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="ghost" onClick={() => setShowForm(true)}>
            + Register project
          </Button>
        )}
      </div>
    </div>
  );
}

function SessionDot({ state }: { state: ProjectWithSession["session"]["connectionState"] }) {
  const color =
    state === "connected"
      ? "bg-emerald-500"
      : state === "connecting"
        ? "bg-amber-500"
        : "bg-slate-300";
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden /> {state}
    </span>
  );
}
