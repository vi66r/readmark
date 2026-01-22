import { useRef, useEffect } from "react";
import { clsx } from "clsx";
import { useAppStore, appActions, useFocusZone, useActiveTab } from "../stores/app-store";
import { useTabNavigation } from "../hooks/useKeyboard";
import { useSaveActiveTab } from "../hooks/useFiles";

type SaveStatus = "saved" | "unsaved" | "saving";

export function TabBar() {
  const { tabs, activeTabId, viewMode, isEditing } = useAppStore();
  const activeTab = useActiveTab();
  const focusZone = useFocusZone();
  const containerRef = useRef<HTMLDivElement>(null);
  const saveActiveTab = useSaveActiveTab();

  const activeIndex = tabs.findIndex((t) => t.id === activeTabId);

  const { onKeyDown } = useTabNavigation(
    tabs.length,
    activeIndex,
    (index) => appActions.setActiveTab(tabs[index].id),
    (index) => appActions.closeTab(tabs[index].id)
  );

  // Scroll active tab into view
  useEffect(() => {
    if (containerRef.current && activeTabId) {
      const activeTabEl = containerRef.current.querySelector(
        `[data-tab-id="${activeTabId}"]`
      );
      if (activeTabEl) {
        activeTabEl.scrollIntoView({ behavior: "smooth", inline: "nearest" });
      }
    }
  }, [activeTabId]);

  // Determine save status
  const getSaveStatus = (): SaveStatus => {
    if (saveActiveTab.isPending) return "saving";
    if (activeTab?.isDirty) return "unsaved";
    return "saved";
  };

  const saveStatus = getSaveStatus();

  // Show edit controls for preview and wysiwyg modes
  const showEditControls = (viewMode === "preview" || viewMode === "wysiwyg") && activeTab;

  const handleEditClick = () => {
    appActions.setEditing(true);
  };

  const handleCommit = async () => {
    await saveActiveTab.mutateAsync();
    appActions.setEditing(false);
  };

  const handleCancel = () => {
    appActions.setEditing(false);
  };

  return (
    <div className="h-10 flex items-stretch bg-[var(--color-bg-secondary)]">
      {/* Tabs container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-stretch overflow-x-auto scrollbar-hide min-w-0"
        onKeyDown={focusZone === "tabs" ? onKeyDown : undefined}
        role="tablist"
      >
        {tabs.length === 0 ? (
          <div className="px-4 flex items-center text-sm text-[var(--color-text-muted)]">
            No files open
          </div>
        ) : (
          tabs.map((tab) => (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => appActions.setActiveTab(tab.id)}
              className={clsx(
                "px-4 flex items-center gap-2 text-sm whitespace-nowrap border-r border-[var(--color-border)]",
                "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-border-focus)]",
                "transition-colors",
                tab.id === activeTabId
                  ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
              )}
              role="tab"
              aria-selected={tab.id === activeTabId}
              tabIndex={focusZone === "tabs" && tab.id === activeTabId ? 0 : -1}
            >
              <span className="truncate max-w-[150px]">{tab.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  appActions.closeTab(tab.id);
                }}
                className="ml-1 p-0.5 rounded hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                title="Close tab"
                tabIndex={-1}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </button>
          ))
        )}
      </div>

      {/* Right side: Status dot + Edit controls */}
      {activeTab && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 border-l border-[var(--color-border)]">
          {/* Status dot */}
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "w-2 h-2 rounded-full transition-colors",
                saveStatus === "unsaved" && "bg-[var(--color-warning)]",
                saveStatus === "saving" && "bg-blue-500 animate-pulse",
                saveStatus === "saved" && "bg-[var(--color-success)]"
              )}
              title={
                saveStatus === "unsaved" ? "Unsaved changes" :
                saveStatus === "saving" ? "Saving..." :
                "Saved"
              }
            />
          </div>

          {/* Edit controls */}
          {showEditControls && (
            <>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  {/* Undo/Redo */}
                  <button
                    onClick={() => document.execCommand('undo')}
                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                    title="Undo"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => document.execCommand('redo')}
                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                    title="Redo"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                    </svg>
                  </button>

                  <div className="w-px h-5 bg-[var(--color-border)]" />

                  <button
                    onClick={handleCancel}
                    className="px-2 py-1 text-xs rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCommit}
                    disabled={saveActiveTab.isPending}
                    className={clsx(
                      "px-3 py-1 text-xs font-medium rounded transition-colors",
                      "bg-[var(--color-accent)] text-[var(--color-bg-primary)]",
                      "hover:bg-[var(--color-accent-hover)]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    Commit
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEditClick}
                  className={clsx(
                    "px-3 py-1 text-xs font-medium rounded transition-colors",
                    "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]",
                    "hover:bg-[var(--color-accent)] hover:text-[var(--color-bg-primary)]",
                    "border border-[var(--color-border)] hover:border-transparent"
                  )}
                >
                  Edit
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
