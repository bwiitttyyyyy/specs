import { Button } from "./ui/primitives";

/**
 * Surfaces a save conflict and forces an explicit choice (T053, FR-020/023, SC-007).
 * Neither side is silently overwritten — the user must either discard their edits
 * (reload the on-disk version) or explicitly overwrite (confirmed destructive action).
 */
export function ConflictDialog({
  yourContent,
  theirContent,
  onReload,
  onOverwrite,
  onCancel,
}: {
  yourContent: string;
  theirContent: string;
  onReload: () => void;
  onOverwrite: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Save conflict"
    >
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-lg bg-surface shadow-xl">
        <header className="border-b border-line px-5 py-3">
          <h3 className="text-lg font-bold text-ink">This artifact changed on disk</h3>
          <p className="mt-0.5 text-sm text-muted">
            It was modified (by the session or another process) since you started editing. Choose
            how to resolve — nothing is overwritten until you decide.
          </p>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-px overflow-hidden bg-line">
          <Pane title="Your unsaved edits" body={yourContent} />
          <Pane title="Current on disk" body={theirContent} />
        </div>
        <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <Button variant="ghost" onClick={onCancel}>
            Keep editing
          </Button>
          <Button variant="ghost" onClick={onReload}>
            Discard mine &amp; reload
          </Button>
          <Button onClick={onOverwrite} className="bg-red-600 hover:bg-red-700">
            Overwrite with mine
          </Button>
        </footer>
      </div>
    </div>
  );
}

function Pane({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-0 flex-col bg-surface">
      <div className="border-b border-line bg-canvas px-3 py-1.5 text-xs font-medium text-muted">
        {title}
      </div>
      <pre className="flex-1 overflow-auto px-3 py-2 text-xs text-ink">{body}</pre>
    </div>
  );
}
