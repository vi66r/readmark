import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { clsx } from "clsx";
import Fuse from "fuse.js";
import { appActions, useAppStore } from "../stores/app-store";
import { useOpenFolder, useSaveActiveTab, useMarkdownFiles, useOpenFileByPath } from "../hooks/useFiles";
import { formatShortcut } from "../lib/platform";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category?: string;
}

export function CommandPalette() {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { workspacePath, activeTabId } = useAppStore();
  const openFolder = useOpenFolder();
  const saveActiveTab = useSaveActiveTab();
  const openFileByPath = useOpenFileByPath();
  const { data: markdownFiles } = useMarkdownFiles(workspacePath);

  // Build commands list
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      {
        id: "open-folder",
        label: "Open Folder",
        shortcut: formatShortcut("O"),
        action: () => {
          openFolder.mutate();
          appActions.closeCommandPalette();
        },
        category: "File",
      },
      {
        id: "save-file",
        label: "Save File",
        shortcut: formatShortcut("S"),
        action: () => {
          if (activeTabId) {
            saveActiveTab.mutate();
          }
          appActions.closeCommandPalette();
        },
        category: "File",
      },
      {
        id: "close-tab",
        label: "Close Tab",
        shortcut: formatShortcut("W"),
        action: () => {
          if (activeTabId) {
            appActions.closeTab(activeTabId);
          }
          appActions.closeCommandPalette();
        },
        category: "File",
      },
      {
        id: "toggle-edit",
        label: "Toggle Edit Mode",
        shortcut: formatShortcut("E"),
        action: () => {
          if (activeTabId) {
            appActions.toggleEditing();
          }
          appActions.closeCommandPalette();
        },
        category: "Edit",
      },
      {
        id: "toggle-sidebar",
        label: "Toggle Sidebar",
        shortcut: formatShortcut("B"),
        action: () => {
          appActions.toggleSidebar();
          appActions.closeCommandPalette();
        },
        category: "View",
      },
      {
        id: "view-source",
        label: "Source View",
        shortcut: formatShortcut("1"),
        action: () => {
          appActions.setViewMode("source");
          appActions.closeCommandPalette();
        },
        category: "View",
      },
      {
        id: "view-preview",
        label: "Preview View",
        shortcut: formatShortcut("2"),
        action: () => {
          appActions.setViewMode("preview");
          appActions.closeCommandPalette();
        },
        category: "View",
      },
      {
        id: "view-split",
        label: "Split View",
        shortcut: formatShortcut("3"),
        action: () => {
          appActions.setViewMode("split");
          appActions.closeCommandPalette();
        },
        category: "View",
      },
      {
        id: "view-wysiwyg",
        label: "WYSIWYG View",
        shortcut: formatShortcut("4"),
        action: () => {
          appActions.setViewMode("wysiwyg");
          appActions.closeCommandPalette();
        },
        category: "View",
      },
    ];

    // Add file commands if we have markdown files
    if (markdownFiles) {
      for (const file of markdownFiles.slice(0, 50)) {
        cmds.push({
          id: `file:${file.path}`,
          label: file.name,
          action: () => {
            openFileByPath.mutate(file.path);
            appActions.closeCommandPalette();
          },
          category: "Files",
        });
      }
    }

    return cmds;
  }, [activeTabId, markdownFiles, openFolder, saveActiveTab, openFileByPath]);

  // Fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(commands, {
        keys: ["label", "category"],
        threshold: 0.4,
        includeScore: true,
      }),
    [commands]
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return commands;
    }
    return fuse.search(query).map((result) => result.item);
  }, [query, fuse, commands]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          appActions.closeCommandPalette();
          break;
      }
    },
    [filteredCommands, selectedIndex]
  );

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    for (const cmd of filteredCommands) {
      const category = cmd.category || "Other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  // Flatten for index tracking
  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => appActions.closeCommandPalette()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl bg-[var(--color-bg-secondary)] rounded-lg shadow-2xl border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-3 border-b border-[var(--color-border)]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="w-full px-3 py-2 text-sm rounded-md
              bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-muted)]
              border border-[var(--color-border)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]"
          />
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto py-2"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-1 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  {category}
                </div>
                {cmds.map((cmd) => {
                  const isSelected = flatIndex === selectedIndex;
                  const currentIndex = flatIndex;
                  flatIndex++;

                  return (
                    <button
                      key={cmd.id}
                      data-selected={isSelected}
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={clsx(
                        "w-full px-4 py-2 flex items-center justify-between text-sm",
                        "hover:bg-[var(--color-bg-tertiary)]",
                        isSelected && "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                      )}
                    >
                      <span className="truncate">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="ml-4 px-2 py-0.5 text-xs rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">↑↓</kbd>
            {" "}Navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">Enter</kbd>
            {" "}Select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">Esc</kbd>
            {" "}Close
          </span>
        </div>
      </div>
    </div>
  );
}
