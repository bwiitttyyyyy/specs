import { useState } from "react";
import { ProjectPicker } from "./pages/ProjectPicker";
import { SpecList } from "./pages/SpecList";
import { SpecWorkspace } from "./pages/SpecWorkspace";
import { ProjectSwitcher } from "./components/ProjectSwitcher";
import { NewSpecDialog } from "./components/NewSpecDialog";
import { Button } from "./components/ui/primitives";

export function App() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [specId, setSpecId] = useState<string | null>(null);
  const [newSpecOpen, setNewSpecOpen] = useState(false);

  if (!projectId) {
    return <ProjectPicker onSelect={setProjectId} />;
  }

  const switchProject = (id: string): void => {
    setProjectId(id);
    setSpecId(null);
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold">Speckit Dashboard</span>
          <ProjectSwitcher activeProjectId={projectId} onSwitch={switchProject} />
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setProjectId(null);
            setSpecId(null);
          }}
        >
          ← Projects
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Specs"
          className="flex w-80 shrink-0 flex-col border-r border-line bg-surface"
        >
          <div className="border-b border-line p-2">
            <Button className="w-full justify-center" onClick={() => setNewSpecOpen(true)}>
              + New spec
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <SpecList projectId={projectId} selectedSpecId={specId} onSelect={setSpecId} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 bg-surface">
          {specId ? (
            <SpecWorkspace projectId={projectId} specId={specId} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              Select a spec to read it.
            </div>
          )}
        </main>
      </div>

      {newSpecOpen && (
        <NewSpecDialog
          projectId={projectId}
          onClose={() => setNewSpecOpen(false)}
          onCreated={(spec) => setSpecId(spec.id)}
        />
      )}
    </div>
  );
}
