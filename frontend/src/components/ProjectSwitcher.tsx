import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ProjectWithSession } from "@speckit-dashboard/shared";
import { api } from "../services/api";

/**
 * Header dropdown to switch the active project without leaving the workspace
 * (T056, FR-002). Shows each project's session status (T057, FR-003).
 */
export function ProjectSwitcher({
  activeProjectId,
  onSwitch,
}: {
  activeProjectId: string;
  onSwitch: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
  const active = projects?.find((p) => p.id === activeProjectId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-brand/40"
      >
        <span className="font-medium">{active?.name ?? "Select project"}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-64 rounded-md border border-line bg-surface py-1 shadow-lg"
        >
          {projects?.map((p: ProjectWithSession) => (
            <li key={p.id} role="option" aria-selected={p.id === activeProjectId}>
              <button
                onClick={() => {
                  setOpen(false);
                  if (p.id !== activeProjectId) {
                    void api.activateProject(p.id);
                    onSwitch(p.id);
                  }
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-canvas ${
                  p.id === activeProjectId ? "font-medium text-brand" : ""
                }`}
              >
                <span className="truncate">{p.name}</span>
                <SessionDot state={p.session.connectionState} />
              </button>
            </li>
          ))}
        </ul>
      )}
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
    <span className={`ml-2 h-2 w-2 shrink-0 rounded-full ${color}`} title={state} aria-hidden />
  );
}
