# Readmark

A keyboard-first markdown reader and editor built as a cross-platform desktop application.

## Features

- **Multiple View Modes** - Source, Preview, Split (side-by-side), and WYSIWYG editing
- **File Browser** - Navigate local directories and manage markdown files
- **Tab Management** - Work with multiple files simultaneously
- **Command Palette** - Quick access to commands with `Cmd/Ctrl+K`
- **In-Document Search** - Fuzzy search with match highlighting
- **File Watcher** - Auto-refresh when files change on disk
- **Drag & Drop** - Open files by dragging them into the app
- **Mermaid Diagrams** - Render diagrams within markdown

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, TailwindCSS 4
- **Editor**: Milkdown 7 (WYSIWYG markdown)
- **Desktop**: Tauri 2 (Rust)
- **Data**: React Query, custom store with useSyncExternalStore

## Prerequisites

- [Node.js](https://nodejs.org/) 16+
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) toolchain

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

```bash
pnpm tauri dev
```

This starts both the Vite dev server and the Tauri desktop app with hot reload.

### Build

```bash
pnpm tauri build
```

Builds the production desktop application for your platform.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server only |
| `pnpm build` | Build frontend |
| `pnpm tauri dev` | Start development with Tauri |
| `pnpm tauri build` | Build desktop application |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix linting issues |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+K` | Command palette |
| `Cmd/Ctrl+F` | Search in document |
| `Cmd/Ctrl+S` | Save file |
| `Cmd/Ctrl+O` | Open folder |
| `Cmd/Ctrl+W` | Close tab |
| `Cmd/Ctrl+E` | Toggle edit mode |
| `Cmd/Ctrl+B` | Toggle sidebar |
| `Cmd/Ctrl+1/2/3/4` | Switch view modes |
| `Cmd/Ctrl+Tab` | Next tab |
| `Cmd/Ctrl+Shift+Tab` | Previous tab |
| `Alt+Tab` | Cycle focus zones |
| `F3` / `Shift+F3` | Navigate search matches |

## IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

MIT
