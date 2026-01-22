import { useAppStore, appActions } from "../stores/app-store";
import { useOpenFolder, useOpenFile, useRefreshWorkspace } from "../hooks/useFiles";
import { FileBrowser } from "./FileBrowser";
import { formatShortcut } from "../lib/platform";
import { clsx } from "clsx";

export function Sidebar() {
  const { workspacePath, tabs, activeTabId } = useAppStore();
  const openFolder = useOpenFolder();
  const openFile = useOpenFile();
  const refreshWorkspace = useRefreshWorkspace();

  // Find tabs that are outside the workspace (free files)
  const freeFiles = tabs.filter(tab => {
    if (!workspacePath) return true; // All files are "free" if no workspace
    return !tab.path.startsWith(workspacePath);
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-[var(--color-border)]">
        <div className="flex gap-2">
          <button
            onClick={() => openFolder.mutate()}
            className="flex-1 px-3 py-2 text-sm font-medium rounded-md
              bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]
              hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-accent)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]
              transition-colors"
          >
            {workspacePath ? "Change Folder" : "Open Folder"}
          </button>
          {workspacePath && (
            <button
              onClick={() => refreshWorkspace.mutate()}
              className="px-2 py-2 text-sm rounded-md
                bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]
                hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-accent)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]
                transition-colors"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Open any file button */}
        <button
          onClick={() => openFile.mutate()}
          className="w-full mt-2 px-3 py-1.5 text-xs rounded-md
            border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]
            hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]
            transition-colors"
        >
          + Open File...
        </button>
      </div>

      {/* File browser or empty state */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {workspacePath ? (
          <FileBrowser rootPath={workspacePath} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-sm text-[var(--color-text-muted)] text-center">
              Open a folder to browse files
              <br />
              <span className="text-xs opacity-75">{formatShortcut("O")}</span>
            </p>
          </div>
        )}

        {/* Free files section */}
        {freeFiles.length > 0 && (
          <div className="flex-shrink-0 border-t border-[var(--color-border)]">
            <div className="px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide bg-[var(--color-bg-tertiary)]">
              Open Files
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {freeFiles.map(file => (
                <FreeFileItem
                  key={file.id}
                  name={file.name}
                  path={file.path}
                  isDirty={file.isDirty}
                  isActive={file.id === activeTabId}
                  onClick={() => appActions.setActiveTab(file.id)}
                  onClose={() => appActions.closeTab(file.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FreeFileItemProps {
  name: string;
  path: string;
  isDirty: boolean;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function FreeFileItem({ name, path, isDirty, isActive, onClick, onClose }: FreeFileItemProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "group flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm",
        "hover:bg-[var(--color-bg-tertiary)]",
        isActive && "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
      )}
      title={path}
    >
      {/* File icon */}
      <svg className="w-4 h-4 flex-shrink-0 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      
      {/* Name with dirty indicator */}
      <span className="truncate flex-1">
        {isDirty && <span className="text-[var(--color-warning)]">● </span>}
        {name}
      </span>
      
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="p-0.5 rounded hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
        tabIndex={-1}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
