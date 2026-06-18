import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ArtifactType, Spec } from "@speckit-dashboard/shared";
import { api, ApiError, type ConflictBody } from "../services/api";
import { Button, ErrorBanner, Spinner } from "./ui/primitives";
import { ConflictDialog } from "./ConflictDialog";

/**
 * Reads an artifact (rendered) and supports in-dashboard editing with dirty-state
 * tracking, save, and conflict resolution (T051/T053, FR-018/020, SC-007).
 * Replaces the read-only SpecViewer in the workspace.
 */
export function ArtifactEditor({
  projectId,
  spec,
  type,
  relativePath,
  onDirtyChange,
}: {
  projectId: string;
  spec: Spec;
  type: ArtifactType;
  relativePath: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["artifact", projectId, spec.id, relativePath],
    queryFn: () => api.getArtifact(projectId, spec.id, type, relativePath),
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [conflict, setConflict] = useState<ConflictBody | null>(null);
  const baselineRef = useRef<string>("");

  // Seed the draft + baseline whenever a fresh artifact loads (and not mid-edit).
  useEffect(() => {
    if (data && !editing) {
      setDraft(data.content);
      baselineRef.current = data.fingerprint;
    }
  }, [data, editing]);

  const dirty = editing && data ? draft !== data.content : false;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const save = useMutation({
    mutationFn: (overwrite: boolean) =>
      api.updateArtifact(
        projectId,
        spec.id,
        type,
        {
          content: draft,
          // On a confirmed overwrite, use the latest on-disk fingerprint as baseline.
          baselineFingerprint:
            overwrite && conflict ? conflict.currentFingerprint : baselineRef.current,
        },
        relativePath,
      ),
    onSuccess: (res) => {
      baselineRef.current = res.fingerprint;
      setEditing(false);
      setConflict(null);
      void queryClient.invalidateQueries({
        queryKey: ["artifact", projectId, spec.id, relativePath],
      });
      void queryClient.invalidateQueries({ queryKey: ["spec", projectId, spec.id] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409 && err.body) {
        setConflict(err.body as unknown as ConflictBody);
      }
    },
  });

  if (isLoading) return <Spinner label="Loading artifact" />;
  if (error) return <ErrorBanner message={(error as Error).message} />;
  if (!data) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {editing ? (
          <>
            <Button onClick={() => save.mutate(false)} disabled={!dirty || save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(data.content);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
          </>
        ) : (
          <Button variant="ghost" onClick={() => setEditing(true)}>
            ✎ Edit
          </Button>
        )}
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={`Edit ${relativePath}`}
          className="h-[60vh] w-full rounded-md border border-line p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
        />
      ) : (
        <article className="prose-spec max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
        </article>
      )}

      {conflict && (
        <ConflictDialog
          yourContent={draft}
          theirContent={conflict.currentContent}
          onCancel={() => setConflict(null)}
          onReload={() => {
            setDraft(conflict.currentContent);
            baselineRef.current = conflict.currentFingerprint;
            setConflict(null);
            setEditing(false);
            void queryClient.invalidateQueries({
              queryKey: ["artifact", projectId, spec.id, relativePath],
            });
          }}
          onOverwrite={() => save.mutate(true)}
        />
      )}
    </div>
  );
}
