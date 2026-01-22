import { useEffect, useCallback } from "react";
import { appActions, useAppStore } from "../stores/app-store";
import { useSaveActiveTab, useOpenFolder } from "./useFiles";

interface KeyboardHandlers {
  onSave?: () => void;
  onOpenFolder?: () => void;
}

/**
 * Global keyboard shortcuts handler
 */
export function useGlobalKeyboard(handlers?: KeyboardHandlers) {
  const { commandPaletteOpen, activeTabId, isEditing, viewMode, searchOpen } = useAppStore();
  const saveActiveTab = useSaveActiveTab();
  const openFolder = useOpenFolder();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      // Command palette takes priority when open
      if (commandPaletteOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          appActions.closeCommandPalette();
        }
        return;
      }

      // Search bar takes priority when open
      if (searchOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          appActions.closeSearch();
        }
        return;
      }

      // Global shortcuts
      if (isMod) {
        switch (e.key.toLowerCase()) {
          case "k":
            e.preventDefault();
            appActions.openCommandPalette();
            break;

          case "f":
            e.preventDefault();
            appActions.openSearch();
            break;

          case "s":
            e.preventDefault();
            if (activeTabId) {
              saveActiveTab.mutate();
              handlers?.onSave?.();
            }
            break;

          case "o":
            e.preventDefault();
            openFolder.mutate();
            handlers?.onOpenFolder?.();
            break;

          case "w":
            e.preventDefault();
            if (activeTabId) {
              appActions.closeTab(activeTabId);
            }
            break;

          case "b":
            e.preventDefault();
            appActions.toggleSidebar();
            break;

          case "e":
            e.preventDefault();
            if (activeTabId) {
              appActions.toggleEditing();
            }
            break;

          case "1":
            e.preventDefault();
            appActions.setViewMode("source");
            break;

          case "2":
            e.preventDefault();
            appActions.setViewMode("preview");
            break;

          case "3":
            e.preventDefault();
            appActions.setViewMode("split");
            break;

          case "4":
            e.preventDefault();
            appActions.setViewMode("wysiwyg");
            break;

          case "tab":
            e.preventDefault();
            if (isShift) {
              appActions.prevTab();
            } else {
              appActions.nextTab();
            }
            break;
        }
      }

      // Alt+Tab to cycle focus zones
      if (isAlt && e.key === "Tab") {
        e.preventDefault();
        appActions.cycleFocusZone();
      }

      // Escape to close things or exit edit mode
      if (e.key === "Escape" && !commandPaletteOpen) {
        if (isEditing && (viewMode === "preview" || viewMode === "wysiwyg")) {
          appActions.setEditing(false);
        } else {
          appActions.setFocusZone("editor");
        }
      }
    },
    [commandPaletteOpen, searchOpen, activeTabId, isEditing, viewMode, saveActiveTab, openFolder, handlers]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for list navigation (file browser, command palette, etc.)
 */
export function useListNavigation<T>(
  items: T[],
  selectedIndex: number,
  onSelect: (index: number) => void,
  onActivate: (item: T) => void,
  onBack?: () => void
) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          onSelect(Math.min(selectedIndex + 1, items.length - 1));
          break;

        case "ArrowUp":
          e.preventDefault();
          onSelect(Math.max(selectedIndex - 1, 0));
          break;

        case "Enter":
          e.preventDefault();
          if (items[selectedIndex]) {
            onActivate(items[selectedIndex]);
          }
          break;

        case "Backspace":
          if (onBack) {
            e.preventDefault();
            onBack();
          }
          break;

        case "Home":
          e.preventDefault();
          onSelect(0);
          break;

        case "End":
          e.preventDefault();
          onSelect(items.length - 1);
          break;
      }
    },
    [items, selectedIndex, onSelect, onActivate, onBack]
  );

  return { onKeyDown: handleKeyDown };
}

/**
 * Hook for tab bar navigation
 */
export function useTabNavigation(
  tabCount: number,
  activeIndex: number,
  onSelect: (index: number) => void,
  onClose: (index: number) => void
) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          onSelect(Math.max(activeIndex - 1, 0));
          break;

        case "ArrowRight":
          e.preventDefault();
          onSelect(Math.min(activeIndex + 1, tabCount - 1));
          break;

        case "Backspace":
        case "Delete":
          e.preventDefault();
          onClose(activeIndex);
          break;
      }
    },
    [tabCount, activeIndex, onSelect, onClose]
  );

  return { onKeyDown: handleKeyDown };
}
