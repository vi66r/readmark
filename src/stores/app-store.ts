import { useSyncExternalStore } from "react";

export type ViewMode = "source" | "preview" | "split" | "wysiwyg";
export type FocusZone = "sidebar" | "tabs" | "editor";

export interface OpenTab {
  id: string;
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
}

interface AppState {
  // Workspace
  workspacePath: string | null;
  
  // Tabs
  tabs: OpenTab[];
  activeTabId: string | null;
  
  // View
  viewMode: ViewMode;
  sidebarVisible: boolean;
  sidebarWidth: number;
  isEditing: boolean;
  
  // Focus
  focusZone: FocusZone;
  
  // Command palette
  commandPaletteOpen: boolean;
  
  // Search
  searchOpen: boolean;
  searchQuery: string;
  searchMatchIndex: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();

// Load persisted settings from localStorage
const STORAGE_KEY = "readmark-settings";

function loadPersistedSettings(): Partial<AppState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return {};
}

function persistSettings(settings: Partial<AppState>) {
  try {
    const current = loadPersistedSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...settings }));
  } catch {
    // Ignore errors
  }
}

const persisted = loadPersistedSettings();

let state: AppState = {
  workspacePath: null,
  tabs: [],
  activeTabId: null,
  viewMode: "preview",
  sidebarVisible: true,
  sidebarWidth: persisted.sidebarWidth ?? 256,
  isEditing: false,
  focusZone: "editor",
  commandPaletteOpen: false,
  searchOpen: false,
  searchQuery: "",
  searchMatchIndex: 0,
};

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppState {
  return state;
}

// Actions
export const appActions = {
  setWorkspacePath(path: string | null) {
    state = { ...state, workspacePath: path, tabs: [], activeTabId: null };
    emitChange();
  },

  openTab(path: string, name: string, content: string) {
    const existingTab = state.tabs.find((t) => t.path === path);
    if (existingTab) {
      state = { ...state, activeTabId: existingTab.id };
    } else {
      const newTab: OpenTab = {
        id: crypto.randomUUID(),
        path,
        name,
        content,
        isDirty: false,
      };
      state = {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      };
    }
    emitChange();
  },

  closeTab(tabId: string) {
    const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
    const newTabs = state.tabs.filter((t) => t.id !== tabId);
    
    let newActiveTabId = state.activeTabId;
    if (state.activeTabId === tabId) {
      if (newTabs.length === 0) {
        newActiveTabId = null;
      } else if (tabIndex >= newTabs.length) {
        newActiveTabId = newTabs[newTabs.length - 1].id;
      } else {
        newActiveTabId = newTabs[tabIndex].id;
      }
    }
    
    state = { ...state, tabs: newTabs, activeTabId: newActiveTabId };
    emitChange();
  },

  setActiveTab(tabId: string) {
    if (state.tabs.some((t) => t.id === tabId)) {
      state = { ...state, activeTabId: tabId };
      emitChange();
    }
  },

  updateTabContent(tabId: string, content: string) {
    state = {
      ...state,
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, content, isDirty: true } : t
      ),
    };
    emitChange();
  },

  // Reload content from disk (external change) - doesn't mark as dirty
  reloadTabContent(tabId: string, content: string) {
    state = {
      ...state,
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, content, isDirty: false } : t
      ),
    };
    emitChange();
  },

  markTabSaved(tabId: string) {
    state = {
      ...state,
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, isDirty: false } : t
      ),
    };
    emitChange();
  },

  nextTab() {
    if (state.tabs.length <= 1) return;
    const currentIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
    const nextIndex = (currentIndex + 1) % state.tabs.length;
    state = { ...state, activeTabId: state.tabs[nextIndex].id };
    emitChange();
  },

  prevTab() {
    if (state.tabs.length <= 1) return;
    const currentIndex = state.tabs.findIndex((t) => t.id === state.activeTabId);
    const prevIndex = (currentIndex - 1 + state.tabs.length) % state.tabs.length;
    state = { ...state, activeTabId: state.tabs[prevIndex].id };
    emitChange();
  },

  setViewMode(mode: ViewMode) {
    state = { ...state, viewMode: mode };
    emitChange();
  },

  toggleSidebar() {
    state = { ...state, sidebarVisible: !state.sidebarVisible };
    emitChange();
  },

  setSidebarWidth(width: number) {
    state = { ...state, sidebarWidth: width };
    persistSettings({ sidebarWidth: width });
    emitChange();
  },

  setEditing(editing: boolean) {
    state = { ...state, isEditing: editing };
    emitChange();
  },

  toggleEditing() {
    state = { ...state, isEditing: !state.isEditing };
    emitChange();
  },

  setFocusZone(zone: FocusZone) {
    state = { ...state, focusZone: zone };
    emitChange();
  },

  cycleFocusZone() {
    const zones: FocusZone[] = ["sidebar", "tabs", "editor"];
    const currentIndex = zones.indexOf(state.focusZone);
    const nextIndex = (currentIndex + 1) % zones.length;
    state = { ...state, focusZone: zones[nextIndex] };
    emitChange();
  },

  openCommandPalette() {
    state = { ...state, commandPaletteOpen: true };
    emitChange();
  },

  closeCommandPalette() {
    state = { ...state, commandPaletteOpen: false };
    emitChange();
  },

  toggleCommandPalette() {
    state = { ...state, commandPaletteOpen: !state.commandPaletteOpen };
    emitChange();
  },

  openSearch() {
    state = { ...state, searchOpen: true };
    emitChange();
  },

  closeSearch() {
    state = { ...state, searchOpen: false };
    emitChange();
  },

  setSearchQuery(query: string) {
    state = { ...state, searchQuery: query, searchMatchIndex: 0 };
    emitChange();
  },

  setSearchMatchIndex(index: number) {
    state = { ...state, searchMatchIndex: index };
    emitChange();
  },
};

// Hook
export function useAppStore(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Selectors
export function useActiveTab(): OpenTab | null {
  const { tabs, activeTabId } = useAppStore();
  return tabs.find((t) => t.id === activeTabId) ?? null;
}

export function useViewMode(): ViewMode {
  return useAppStore().viewMode;
}

export function useFocusZone(): FocusZone {
  return useAppStore().focusZone;
}

export function useIsEditing(): boolean {
  return useAppStore().isEditing;
}

export function useSidebarWidth(): number {
  return useAppStore().sidebarWidth;
}
