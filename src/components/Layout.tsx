import { useRef, useEffect, useState, useCallback } from "react";
import { clsx } from "clsx";
import { useAppStore, appActions, type FocusZone } from "../stores/app-store";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { StatusBar } from "./StatusBar";
import { EditorArea } from "./EditorArea";
import { CommandPalette } from "./CommandPalette";

export function Layout() {
  const { sidebarVisible, sidebarWidth, focusZone, commandPaletteOpen } = useAppStore();
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [isResizing, setIsResizing] = useState(false);

  // Focus management
  useEffect(() => {
    const focusMap: Record<FocusZone, React.RefObject<HTMLDivElement | null>> = {
      sidebar: sidebarRef,
      tabs: tabBarRef,
      editor: editorRef,
    };

    const ref = focusMap[focusZone];
    if (ref?.current) {
      const focusable = ref.current.querySelector<HTMLElement>(
        '[tabindex="0"], button, input, textarea, [contenteditable="true"]'
      );
      if (focusable) {
        focusable.focus();
      } else {
        ref.current.focus();
      }
    }
  }, [focusZone]);

  // Sidebar resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(500, e.clientX));
      appActions.setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className={clsx(
      "h-full flex flex-col bg-[var(--color-bg-primary)]",
      isResizing && "select-none cursor-col-resize"
    )}>
      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        {sidebarVisible && (
          <>
            <div
              ref={sidebarRef}
              style={{ width: sidebarWidth }}
              className="flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] focus:outline-none"
              tabIndex={focusZone === "sidebar" ? 0 : -1}
              onFocus={() => appActions.setFocusZone("sidebar")}
            >
              <Sidebar />
            </div>
            {/* Resize handle */}
            <div
              onMouseDown={handleResizeStart}
              className={clsx(
                "w-1 flex-shrink-0 cursor-col-resize hover:bg-[var(--color-accent)] transition-colors",
                isResizing && "bg-[var(--color-accent)]"
              )}
            />
          </>
        )}

        {/* Main editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div
            ref={tabBarRef}
            className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] focus:outline-none"
            tabIndex={focusZone === "tabs" ? 0 : -1}
            onFocus={() => appActions.setFocusZone("tabs")}
          >
            <TabBar />
          </div>

          {/* Editor */}
          <div
            ref={editorRef}
            className="flex-1 min-h-0 overflow-hidden focus:outline-none"
            tabIndex={focusZone === "editor" ? 0 : -1}
            onFocus={() => appActions.setFocusZone("editor")}
          >
            <EditorArea />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Command palette overlay */}
      {commandPaletteOpen && <CommandPalette />}
    </div>
  );
}
