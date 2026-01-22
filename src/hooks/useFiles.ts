import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  readFile,
  writeFile,
  listDirectory,
  listMarkdownFiles,
  openFolderDialog,
  openFileDialog,
  watchDirectory,
  unwatchDirectory,
  onFileChange,
  type DirectoryContents,
  type FileEntry,
} from "../lib/tauri";
import { appActions, useAppStore } from "../stores/app-store";

/**
 * Hook to list directory contents
 */
export function useDirectory(path: string | null) {
  return useQuery<DirectoryContents | null>({
    queryKey: ["directory", path],
    queryFn: async () => {
      if (!path) return null;
      return listDirectory(path);
    },
    enabled: !!path,
  });
}

/**
 * Hook to list all markdown files in a directory recursively
 */
export function useMarkdownFiles(path: string | null) {
  return useQuery<FileEntry[]>({
    queryKey: ["markdown-files", path],
    queryFn: async () => {
      if (!path) return [];
      return listMarkdownFiles(path);
    },
    enabled: !!path,
  });
}

/**
 * Hook to read file content
 */
export function useFileContent(path: string | null) {
  return useQuery<string>({
    queryKey: ["file", path],
    queryFn: async () => {
      if (!path) return "";
      return readFile(path);
    },
    enabled: !!path,
  });
}

/**
 * Hook to save file content
 */
export function useSaveFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      await writeFile(path, content);
      return { path, content };
    },
    onSuccess: ({ path }) => {
      queryClient.invalidateQueries({ queryKey: ["file", path] });
    },
  });
}

/**
 * Hook to open a folder
 */
export function useOpenFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const path = await openFolderDialog();
      return path;
    },
    onSuccess: (path) => {
      if (path) {
        appActions.setWorkspacePath(path);
        queryClient.invalidateQueries({ queryKey: ["directory"] });
        queryClient.invalidateQueries({ queryKey: ["markdown-files"] });
      }
    },
  });
}

/**
 * Hook to refresh the current workspace
 */
export function useRefreshWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Just invalidate queries to refresh
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      queryClient.invalidateQueries({ queryKey: ["markdown-files"] });
    },
  });
}

/**
 * Hook to open a file
 */
export function useOpenFile() {
  return useMutation({
    mutationFn: async () => {
      const path = await openFileDialog();
      if (!path) return null;
      
      const content = await readFile(path);
      const name = path.split("/").pop() || path;
      
      return { path, name, content };
    },
    onSuccess: (result) => {
      if (result) {
        appActions.openTab(result.path, result.name, result.content);
      }
    },
  });
}

/**
 * Hook to open a file by path
 */
export function useOpenFileByPath() {
  return useMutation({
    mutationFn: async (path: string) => {
      const content = await readFile(path);
      const name = path.split("/").pop() || path;
      return { path, name, content };
    },
    onSuccess: (result) => {
      appActions.openTab(result.path, result.name, result.content);
    },
  });
}

/**
 * Hook to save the active tab
 */
export function useSaveActiveTab() {
  const { tabs, activeTabId } = useAppStore();
  const saveFile = useSaveFile();

  return useMutation({
    mutationFn: async () => {
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (!activeTab) {
        throw new Error("No active tab");
      }
      
      await saveFile.mutateAsync({
        path: activeTab.path,
        content: activeTab.content,
      });
      
      return activeTab.id;
    },
    onSuccess: (tabId) => {
      appActions.markTabSaved(tabId);
    },
  });
}

/**
 * Hook to watch the workspace directory for changes
 */
export function useFileWatcher() {
  const { workspacePath, tabs } = useAppStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspacePath) return;

    let unlisten: (() => void) | null = null;

    const setupWatcher = async () => {
      try {
        // Start watching the directory
        await watchDirectory(workspacePath);

        // Listen for file change events
        unlisten = await onFileChange(async (event) => {
          // Invalidate directory queries to refresh the file list
          queryClient.invalidateQueries({ queryKey: ["directory"] });
          queryClient.invalidateQueries({ queryKey: ["markdown-files"] });

          // Check if any open tab matches the changed file
          const changedPath = event.path;
          const openTab = tabs.find(tab => tab.path === changedPath);
          
          if (openTab && !openTab.isDirty) {
            // Reload content if the file changed and tab is not dirty
            try {
              const newContent = await readFile(changedPath);
              appActions.reloadTabContent(openTab.id, newContent);
            } catch (error) {
              console.error("Failed to reload file:", error);
            }
          }
        });
      } catch (error) {
        console.error("Failed to setup file watcher:", error);
      }
    };

    setupWatcher();

    return () => {
      if (unlisten) {
        unlisten();
      }
      unwatchDirectory().catch(console.error);
    };
  }, [workspacePath, tabs, queryClient]);
}
