import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Spec } from "@speckit-dashboard/shared";
import { api } from "../services/api";
import { Button, ErrorBanner } from "./ui/primitives";

/**
 * Create a new spec from the dashboard (T058, FR-021). Scaffolds the spec and
 * adds it to the list; the user then runs /speckit-specify in the session panel
 * to flesh it out.
 */
export function NewSpecDialog({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: (spec: Spec) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => api.createSpec(projectId, { name, description }),
    onSuccess: (spec) => {
      void queryClient.invalidateQueries({ queryKey: ["specs", projectId] });
      onCreated(spec);
      onClose();
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Create new spec"
    >
      <form
        className="w-full max-w-md space-y-3 rounded-lg bg-surface p-5 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <h3 className="text-lg font-bold">New spec</h3>
        <label className="block text-sm">
          <span className="text-muted">Feature name</span>
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Export reports as PDF"
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should this feature do?"
            rows={3}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </label>
        {create.error && <ErrorBanner message={(create.error as Error).message} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            {create.isPending ? "Creating…" : "Create spec"}
          </Button>
        </div>
      </form>
    </div>
  );
}
