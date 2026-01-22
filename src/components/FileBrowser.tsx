import { useState, useRef, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { useDirectory, useOpenFileByPath } from "../hooks/useFiles";
import { useListNavigation } from "../hooks/useKeyboard";
import { useFocusZone } from "../stores/app-store";
import type { FileEntry } from "../lib/tauri";

interface FileBrowserProps {
  rootPath: string;
}

interface TreeNode extends FileEntry {
  children?: TreeNode[];
  isExpanded?: boolean;
  level: number;
}

export function FileBrowser({ rootPath }: FileBrowserProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([rootPath]));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterText, setFilterText] = useState("");
  const [dirCache, setDirCache] = useState<Record<string, FileEntry[]>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const focusZone = useFocusZone();
  const openFile = useOpenFileByPath();

  // Fetch root directory
  const { data: rootDir, isLoading, dataUpdatedAt } = useDirectory(rootPath);

  // Update cache when root data changes - also clear stale cached subdirs
  useEffect(() => {
    if (rootDir?.entries) {
      // When root is refreshed, re-fetch all expanded directories
      setDirCache({ [rootPath]: rootDir.entries });
      
      // Re-fetch expanded subdirectories
      const refetchExpanded = async () => {
        const { listDirectory } = await import("../lib/tauri");
        for (const path of expandedPaths) {
          if (path !== rootPath) {
            try {
              const result = await listDirectory(path);
              setDirCache(prev => ({ ...prev, [path]: result.entries }));
            } catch {
              // Directory might have been deleted
            }
          }
        }
      };
      refetchExpanded();
    }
  }, [rootDir, rootPath, dataUpdatedAt, expandedPaths]);

  // Build flat list of visible items from cache
  const buildVisibleItems = useCallback((): TreeNode[] => {
    const items: TreeNode[] = [];
    
    const addItems = (entries: FileEntry[] | undefined, level: number) => {
      if (!entries) return;
      
      for (const entry of entries) {
        // Filter by text
        if (filterText && !entry.name.toLowerCase().includes(filterText.toLowerCase())) {
          continue;
        }

        const node: TreeNode = {
          ...entry,
          level,
          isExpanded: expandedPaths.has(entry.path),
        };
        items.push(node);

        // Add children if expanded and in cache
        if (entry.is_dir && expandedPaths.has(entry.path)) {
          const cachedEntries = dirCache[entry.path];
          if (cachedEntries) {
            addItems(cachedEntries, level + 1);
          }
        }
      }
    };

    addItems(dirCache[rootPath], 0);
    return items;
  }, [dirCache, expandedPaths, filterText, rootPath]);

  const visibleItems = buildVisibleItems();

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= visibleItems.length) {
      setSelectedIndex(Math.max(0, visibleItems.length - 1));
    }
  }, [visibleItems.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current) {
      const selectedEl = containerRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const toggleExpand = async (path: string) => {
    const isExpanding = !expandedPaths.has(path);
    
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });

    // Fetch directory contents if expanding and not in cache
    if (isExpanding && !dirCache[path]) {
      try {
        const { listDirectory } = await import("../lib/tauri");
        const result = await listDirectory(path);
        setDirCache(prev => ({ ...prev, [path]: result.entries }));
      } catch (error) {
        console.error("Failed to fetch directory:", error);
      }
    }
  };

  const handleActivate = (item: TreeNode) => {
    if (item.is_dir) {
      toggleExpand(item.path);
    } else if (item.is_markdown) {
      openFile.mutate(item.path);
    }
  };

  const handleBack = () => {
    const item = visibleItems[selectedIndex];
    if (item?.is_dir && expandedPaths.has(item.path)) {
      toggleExpand(item.path);
    } else if (item?.level > 0) {
      // Find parent and collapse it
      const parentPath = item.path.substring(0, item.path.lastIndexOf("/"));
      if (expandedPaths.has(parentPath)) {
        toggleExpand(parentPath);
        // Select the parent
        const parentIndex = visibleItems.findIndex((i) => i.path === parentPath);
        if (parentIndex !== -1) {
          setSelectedIndex(parentIndex);
        }
      }
    }
  };

  const { onKeyDown } = useListNavigation(
    visibleItems,
    selectedIndex,
    setSelectedIndex,
    handleActivate,
    handleBack
  );

  const handleFilterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setFilterText("");
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      containerRef.current?.focus();
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-[var(--color-text-muted)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filter input */}
      <div className="flex-shrink-0 p-2 border-b border-[var(--color-border)]">
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          onKeyDown={handleFilterKeyDown}
          placeholder="Filter files..."
          className="w-full px-2 py-1 text-sm rounded
            bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-muted)]
            border border-[var(--color-border)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]"
        />
      </div>

      {/* File list */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto py-1 focus:outline-none"
        tabIndex={focusZone === "sidebar" ? 0 : -1}
        onKeyDown={focusZone === "sidebar" ? onKeyDown : undefined}
        role="tree"
      >
        {visibleItems.length === 0 ? (
          <div className="p-4 text-sm text-[var(--color-text-muted)]">
            {filterText ? "No matching files" : "No files found"}
          </div>
        ) : (
          visibleItems.map((item, index) => (
            <FileTreeItem
              key={item.path}
              item={item}
              isSelected={index === selectedIndex}
              onClick={() => {
                setSelectedIndex(index);
                handleActivate(item);
              }}
              onToggle={() => toggleExpand(item.path)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface FileTreeItemProps {
  item: TreeNode;
  isSelected: boolean;
  onClick: () => void;
  onToggle: () => void;
}

function FileTreeItem({ item, isSelected, onClick, onToggle }: FileTreeItemProps) {
  return (
    <div
      data-selected={isSelected}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1 px-2 py-1 cursor-pointer text-sm",
        "hover:bg-[var(--color-bg-tertiary)]",
        isSelected && "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
      )}
      style={{ paddingLeft: `${item.level * 12 + 8}px` }}
      role="treeitem"
      aria-expanded={item.is_dir ? item.isExpanded : undefined}
    >
      {/* Expand/collapse icon for directories */}
      {item.is_dir ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="w-4 h-4 flex items-center justify-center text-[var(--color-text-muted)]"
          tabIndex={-1}
        >
          <svg
            className={clsx("w-3 h-3 transition-transform", item.isExpanded && "rotate-90")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <span className="w-4" />
      )}

      {/* Icon */}
      {item.is_dir ? (
        <svg className="w-4 h-4 text-[var(--color-accent)]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      ) : item.is_markdown ? (
        <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-[var(--color-text-muted)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )}

      {/* Name */}
      <span className={clsx("truncate", !item.is_markdown && !item.is_dir && "opacity-50")}>
        {item.name}
      </span>
    </div>
  );
}
