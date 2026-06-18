import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Spec } from "@speckit-dashboard/shared";
import { api } from "../services/api";
import { ErrorBanner, EmptyState, Spinner, StatusBadge } from "../components/ui/primitives";

/** Searchable list of specs in a project (FR-005/008/009). */
export function SpecList({
  projectId,
  selectedSpecId,
  onSelect,
}: {
  projectId: string;
  selectedSpecId: string | null;
  onSelect: (specId: string) => void;
}) {
  const [q, setQ] = useState("");
  const {
    data: specs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["specs", projectId, q],
    queryFn: () => api.listSpecs(projectId, q || undefined),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search specs…"
          aria-label="Search specs"
          className="w-full rounded-md border border-line px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && <Spinner label="Loading specs" />}
        {error && <ErrorBanner message={(error as Error).message} />}
        {specs?.length === 0 && <EmptyState title="No specs found" />}
        <ul className="space-y-1">
          {specs?.map((spec: Spec) => (
            <li key={spec.id}>
              <button
                onClick={() => onSelect(spec.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40 ${
                  spec.id === selectedSpecId ? "bg-brand/10" : "hover:bg-canvas"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{spec.name}</span>
                  <StatusBadge status={spec.lifecycleStatus} />
                </span>
                <span className="mt-0.5 block font-mono text-xs text-muted">
                  {spec.id}
                  {spec.malformed && (
                    <span className="ml-2 text-amber-600">⚠ non-standard name</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
