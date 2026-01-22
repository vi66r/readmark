import { Layout } from "./components/Layout";
import { useGlobalKeyboard } from "./hooks/useKeyboard";
import { useFileWatcher } from "./hooks/useFiles";
import { useDragDrop } from "./hooks/useDragDrop";

function App() {
  // Set up global keyboard shortcuts
  useGlobalKeyboard();
  
  // Set up file watcher for auto-refresh
  useFileWatcher();
  
  // Set up drag and drop
  const { isDragging } = useDragDrop();

  return (
    <>
      <Layout />
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-primary)]/90 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-bg-secondary)]">
            <svg className="w-16 h-16 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium text-[var(--color-text-primary)]">
              Drop markdown files to open
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              .md and .markdown files supported
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
