import { useEffect, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { readFile } from "../lib/tauri";
import { appActions } from "../stores/app-store";

interface TauriDragDropEvent {
  paths: string[];
  position: { x: number; y: number };
}

/**
 * Hook to handle drag and drop of files into the app
 */
export function useDragDrop() {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileDrop = useCallback(async (paths: string[]) => {
    for (const path of paths) {
      // Only open markdown files
      if (path.toLowerCase().endsWith(".md") || path.toLowerCase().endsWith(".markdown")) {
        try {
          const content = await readFile(path);
          const name = path.split("/").pop() || path;
          appActions.openTab(path, name, content);
        } catch (error) {
          console.error("Failed to open dropped file:", error);
        }
      }
    }
  }, []);

  useEffect(() => {
    let unlistenDrop: (() => void) | null = null;
    let unlistenHover: (() => void) | null = null;
    let unlistenCancel: (() => void) | null = null;

    const setup = async () => {
      // Listen for file drop
      unlistenDrop = await listen<TauriDragDropEvent>("tauri://drag-drop", (event) => {
        setIsDragging(false);
        handleFileDrop(event.payload.paths);
      });

      // Listen for drag hover (file is over window)
      unlistenHover = await listen("tauri://drag-enter", () => {
        setIsDragging(true);
      });

      // Listen for drag leave
      unlistenCancel = await listen("tauri://drag-leave", () => {
        setIsDragging(false);
      });
    };

    setup();

    return () => {
      unlistenDrop?.();
      unlistenHover?.();
      unlistenCancel?.();
    };
  }, [handleFileDrop]);

  return { isDragging };
}
