import { clsx } from "clsx";
import { useAppStore, useActiveTab, type ViewMode } from "../stores/app-store";
import { formatShortcut } from "../lib/platform";

const viewModeLabels: Record<ViewMode, string> = {
  source: "SOURCE",
  preview: "READING",
  split: "SPLIT",
  wysiwyg: "EDITING",
};

export function StatusBar() {
  const { viewMode, isEditing } = useAppStore();
  const activeTab = useActiveTab();

  // Calculate line and column from content (simplified)
  const getLineCol = () => {
    if (!activeTab?.content) return { line: 1, col: 1 };
    const lines = activeTab.content.split("\n");
    return { line: lines.length, col: 1 };
  };

  const { line, col } = getLineCol();

  return (
    <div className="h-8 flex items-center px-3 text-xs bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)] text-[var(--color-text-muted)]">
      {/* View mode indicator */}
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            "px-2 py-0.5 rounded font-medium",
            "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
          )}
        >
          {viewModeLabels[viewMode]}
        </span>
        {isEditing && viewMode === "preview" && (
          <span className="text-[var(--color-accent)]">
            (Editing)
          </span>
        )}
      </div>

      {/* Separator */}
      <div className="mx-3 h-3 w-px bg-[var(--color-border)]" />

      {/* Line and column */}
      {activeTab && (
        <>
          <span>
            Ln {line}, Col {col}
          </span>
          <div className="mx-3 h-3 w-px bg-[var(--color-border)]" />
        </>
      )}

      {/* File path */}
      {activeTab && (
        <span className="truncate" title={activeTab.path}>
          {activeTab.name}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Keyboard hint */}
      <div className="opacity-50 flex items-center gap-3">
        <span>{formatShortcut("K")} Commands</span>
        <span>{formatShortcut("E")} Edit</span>
      </div>
    </div>
  );
}
