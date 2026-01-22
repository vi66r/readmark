import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";

export interface FileChangeEvent {
  path: string;
  kind: string;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_markdown: boolean;
}

export interface DirectoryContents {
  path: string;
  entries: FileEntry[];
}

/**
 * Read the contents of a text file
 */
export async function readFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

/**
 * Write content to a text file
 */
export async function writeFile(path: string, content: string): Promise<void> {
  return invoke("write_text_file", { path, content });
}

/**
 * List contents of a directory (non-recursive)
 */
export async function listDirectory(path: string): Promise<DirectoryContents> {
  return invoke<DirectoryContents>("list_dir", { path });
}

/**
 * Recursively list all markdown files in a directory
 */
export async function listMarkdownFiles(path: string): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("list_md_files", { path });
}

/**
 * Check if a file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  return invoke<boolean>("path_exists", { path });
}

/**
 * Get file metadata
 */
export async function getFileInfo(path: string): Promise<FileEntry> {
  return invoke<FileEntry>("get_file_metadata", { path });
}

/**
 * Open a folder picker dialog
 */
export async function openFolderDialog(): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
    title: "Open Folder",
  });
  return result as string | null;
}

/**
 * Open a file picker dialog for markdown files
 */
export async function openFileDialog(): Promise<string | null> {
  const result = await open({
    directory: false,
    multiple: false,
    title: "Open Markdown File",
    filters: [
      {
        name: "Markdown",
        extensions: ["md", "markdown"],
      },
    ],
  });
  return result as string | null;
}

/**
 * Open a URL in the default browser
 */
export async function openUrl(url: string): Promise<void> {
  try {
    await tauriOpenUrl(url);
  } catch (error) {
    console.error("Failed to open URL:", error);
  }
}

/**
 * Start watching a directory for file changes
 */
export async function watchDirectory(path: string): Promise<void> {
  return invoke("watch_directory", { path });
}

/**
 * Stop watching the current directory
 */
export async function unwatchDirectory(): Promise<void> {
  return invoke("unwatch_directory");
}

/**
 * Listen for file change events
 */
export function onFileChange(callback: (event: FileChangeEvent) => void): Promise<UnlistenFn> {
  return listen<FileChangeEvent>("file-change", (event) => {
    callback(event.payload);
  });
}
