import { Button } from "./ui/primitives";
import type { SessionHandle } from "../services/ws";
import { useSessionStore } from "../state/connection";

/** One-click speckit commands run against the open spec via the session (T042, FR-011). */
const COMMANDS = [
  "/speckit-clarify",
  "/speckit-plan",
  "/speckit-tasks",
  "/speckit-analyze",
  "/speckit-checklist",
  "/speckit-implement",
];

export function CommandBar({ session }: { session: SessionHandle }) {
  const connectionState = useSessionStore((s) => s.connectionState);
  const activity = useSessionStore((s) => s.activity);
  const disabled = connectionState !== "connected" || activity !== "idle";

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2" aria-label="Commands">
      {COMMANDS.map((cmd) => (
        <Button
          key={cmd}
          variant="ghost"
          disabled={disabled}
          onClick={() => session.runCommand(cmd)}
          className="font-mono text-xs"
        >
          {cmd}
        </Button>
      ))}
    </div>
  );
}
