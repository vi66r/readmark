import { useActiveTab, useViewMode, useAppStore, appActions } from "../stores/app-store";
import { SourceEditor } from "./SourceEditor";
import { PreviewPane } from "./PreviewPane";
import { WysiwygEditor } from "./WysiwygEditor";
import { SplitView } from "./SplitView";
import { SearchBar } from "./SearchBar";

export function EditorArea() {
  const activeTab = useActiveTab();
  const viewMode = useViewMode();
  const { searchOpen } = useAppStore();

  if (!activeTab) {
    return <EmptyState />;
  }

  const renderEditor = () => {
    switch (viewMode) {
      case "source":
        return <SourceEditor />;
      case "preview":
        return <PreviewPane />;
      case "split":
        return <SplitView />;
      case "wysiwyg":
        return <WysiwygEditor />;
      default:
        return <EmptyState />;
    }
  };

  return (
    <div className="relative h-full">
      {/* Search bar */}
      <SearchBar
        isOpen={searchOpen}
        onClose={() => appActions.closeSearch()}
        content={activeTab.content}
      />
      
      {/* Editor content */}
      {renderEditor()}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)]">
      <svg
        className="w-16 h-16 mb-4 opacity-30"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h2 className="text-lg font-medium mb-2">No file open</h2>
      <p className="text-sm opacity-75 mb-4">
        Open a folder and select a markdown file to get started
      </p>
      <div className="flex flex-col gap-2 text-xs">
        <KeyboardHint shortcut="O" action="Open folder" />
        <KeyboardHint shortcut="K" action="Command palette" />
      </div>
    </div>
  );
}

function KeyboardHint({ shortcut, action }: { shortcut: string; action: string }) {
  // Detect Mac vs other platforms
  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const mod = isMac ? "⌘" : "Ctrl+";

  return (
    <div className="flex items-center gap-2">
      <kbd className="px-2 py-1 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] font-mono">
        {mod}{shortcut}
      </kbd>
      <span>{action}</span>
    </div>
  );
}
