use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_markdown: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryContents {
    pub path: String,
    pub entries: Vec<FileEntry>,
}

#[derive(Debug, Serialize, Clone)]
pub struct FileChangeEvent {
    pub path: String,
    pub kind: String,
}

// Global state for the file watcher
struct WatcherState {
    watcher: Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>,
    watched_path: Option<String>,
}

/// Read the contents of a text file
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Write content to a text file
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

/// List contents of a directory (non-recursive, sorted)
#[tauri::command]
fn list_dir(path: String) -> Result<DirectoryContents, String> {
    let path_buf = PathBuf::from(&path);
    
    if !path_buf.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }
    
    if !path_buf.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    
    let mut entries: Vec<FileEntry> = Vec::new();
    
    let read_dir = fs::read_dir(&path_buf).map_err(|e| format!("Failed to read directory: {}", e))?;
    
    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        
        // Skip hidden files
        if file_name.starts_with('.') {
            continue;
        }
        
        let file_path = entry.path();
        let is_dir = file_path.is_dir();
        let is_markdown = !is_dir && file_name.to_lowercase().ends_with(".md");
        
        entries.push(FileEntry {
            name: file_name,
            path: file_path.to_string_lossy().to_string(),
            is_dir,
            is_markdown,
        });
    }
    
    // Sort: directories first, then files, alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    Ok(DirectoryContents {
        path,
        entries,
    })
}

/// Recursively list all markdown files in a directory
#[tauri::command]
fn list_md_files(path: String) -> Result<Vec<FileEntry>, String> {
    let path_buf = PathBuf::from(&path);
    
    if !path_buf.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }
    
    let mut entries: Vec<FileEntry> = Vec::new();
    
    for entry in WalkDir::new(&path_buf)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let file_path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();
        
        // Skip hidden files and directories
        if file_name.starts_with('.') {
            continue;
        }
        
        if file_path.is_file() && file_name.to_lowercase().ends_with(".md") {
            entries.push(FileEntry {
                name: file_name,
                path: file_path.to_string_lossy().to_string(),
                is_dir: false,
                is_markdown: true,
            });
        }
    }
    
    // Sort alphabetically by path
    entries.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
    
    Ok(entries)
}

/// Check if a path exists
#[tauri::command]
fn path_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

/// Get file metadata
#[tauri::command]
fn get_file_metadata(path: String) -> Result<FileEntry, String> {
    let path_buf = PathBuf::from(&path);
    
    if !path_buf.exists() {
        return Err(format!("File does not exist: {}", path));
    }
    
    let file_name = path_buf
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    
    let is_dir = path_buf.is_dir();
    let is_markdown = !is_dir && file_name.to_lowercase().ends_with(".md");
    
    Ok(FileEntry {
        name: file_name,
        path,
        is_dir,
        is_markdown,
    })
}

/// Start watching a directory for changes
#[tauri::command]
fn watch_directory(path: String, app: AppHandle, state: tauri::State<'_, Mutex<WatcherState>>) -> Result<(), String> {
    let mut watcher_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    // Stop existing watcher if any
    watcher_state.watcher = None;
    watcher_state.watched_path = None;
    
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() || !path_buf.is_dir() {
        return Err("Invalid directory path".to_string());
    }
    
    let app_handle = app.clone();
    
    let mut debouncer = new_debouncer(Duration::from_millis(500), move |res: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
        match res {
            Ok(events) => {
                for event in events {
                    let kind = match event.kind {
                        DebouncedEventKind::Any => "change",
                        DebouncedEventKind::AnyContinuous => "change",
                        _ => "change",
                    };
                    
                    let change_event = FileChangeEvent {
                        path: event.path.to_string_lossy().to_string(),
                        kind: kind.to_string(),
                    };
                    
                    let _ = app_handle.emit("file-change", change_event);
                }
            }
            Err(e) => {
                eprintln!("Watch error: {:?}", e);
            }
        }
    }).map_err(|e| format!("Failed to create watcher: {}", e))?;
    
    debouncer.watcher().watch(&path_buf, notify::RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch directory: {}", e))?;
    
    watcher_state.watcher = Some(debouncer);
    watcher_state.watched_path = Some(path);
    
    Ok(())
}

/// Stop watching directory
#[tauri::command]
fn unwatch_directory(state: tauri::State<'_, Mutex<WatcherState>>) -> Result<(), String> {
    let mut watcher_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    watcher_state.watcher = None;
    watcher_state.watched_path = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(WatcherState {
            watcher: None,
            watched_path: None,
        }))
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            list_dir,
            list_md_files,
            path_exists,
            get_file_metadata,
            watch_directory,
            unwatch_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
