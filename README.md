# File Integrity Checker

A Windows desktop application that monitors folders for unauthorised file changes using SHA-256 hashing. Built as a portfolio project to demonstrate full-stack Electron development with a focus on security tooling.

![App screenshot placeholder](assets/icon.png)

---

## Features

| Feature | Description |
|---|---|
| **Baseline creation** | SHA-256 hash every file in a folder and store as a trusted snapshot |
| **Manual scanning** | Compare current files against the baseline, surface ADDED / MODIFIED / DELETED |
| **Real-time watching** | chokidar file-system watcher fires per-event alerts without a full scan |
| **Scheduled scans** | node-cron jobs run hourly, daily, or weekly scans automatically |
| **Scan history** | Every scan is persisted in SQLite and browsable with a per-scan result viewer |
| **Exclude patterns** | Substring-matched exclusions (e.g. `node_modules`, `*.log`) skip noise |
| **System tray** | App hides to tray on close, shows desktop notifications on changes |
| **NSIS installer** | electron-builder produces a one-click Windows installer |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 31 |
| Renderer | React 18 + Vite (via electron-vite 2) |
| Styling | CSS custom properties — zero CSS frameworks |
| Icons | lucide-react |
| Database | better-sqlite3 9 (synchronous SQLite, WAL mode) |
| File watching | chokidar 3 |
| Scheduling | node-cron 3 |
| Hashing | Node.js `crypto` — SHA-256 streaming reads |
| Packaging | electron-builder 25 (NSIS target) |

---

## Architecture

```
src/
├── main/               # Electron main process (Node.js, ESM)
│   ├── index.js        # BrowserWindow, tray, app lifecycle
│   ├── handlers.js     # All ipcMain.handle() registrations
│   ├── db.js           # SQLite schema + singleton connection
│   ├── scanner.js      # Recursive file walk + SHA-256 hashing
│   ├── baseline.js     # Read/write baseline_files table
│   ├── compare.js      # Diff current files against baseline
│   ├── scheduler.js    # node-cron job registry
│   ├── watcher.js      # chokidar watcher registry
│   └── store.js        # JSON settings persistence
├── preload/
│   └── index.js        # contextBridge — exposes window.api to renderer
└── renderer/           # React app (Vite, browser context)
    └── src/
        ├── App.jsx             # Root router (useState-based, no React Router)
        ├── views/              # Dashboard, History, ScanResults, Settings
        ├── components/         # Sidebar, StatusBadge, ProgressBar, EmptyState
        ├── hooks/              # useFolders, useScanner
        └── styles/globals.css  # Full design-token system (dark theme)
```

### IPC channels

| Channel | Direction | Description |
|---|---|---|
| `select-folder` | renderer → main | Opens native folder picker |
| `create-baseline` | renderer → main | Scan + hash + store snapshot |
| `run-scan` | renderer → main | Compare current state to baseline |
| `get-folders` | renderer → main | List monitored folders with counts |
| `get-history` | renderer → main | Scan history for a folder |
| `get-scan-results` | renderer → main | File-level results for a scan |
| `set-schedule` | renderer → main | Register a cron job for a folder |
| `clear-schedule` | renderer → main | Remove a cron job |
| `start-watch` | renderer → main | Start chokidar watcher |
| `stop-watch` | renderer → main | Stop chokidar watcher |
| `remove-folder` | renderer → main | Delete folder + all associated data |
| `scan-progress` | main → renderer | Progress events during a scan |
| `watch-event` | main → renderer | File-system events from watcher |

### Database schema

```sql
folders        (id, path, watch_mode, schedule_interval, created_at)
baseline_files (id, folder_id→folders, file_path, hash, file_size, baseline_at)
scans          (id, folder_id→folders, triggered_by, total_files, changes_found, scanned_at)
scan_results   (id, scan_id→scans, file_path, status, old_hash, new_hash)
```

---

## Getting Started

### Prerequisites

- Windows 10/11
- Node.js 20+
- Python 3.x with `setuptools` (`pip install setuptools`)
- Visual Studio 2022 with **Desktop development with C++** workload
- Windows 11 SDK (required for better-sqlite3 native compilation)

### Install

```bash
git clone https://github.com/Johndenisnyagah/file-integrity-checker.git
cd file-integrity-checker
npm install
```

> `postinstall` automatically downloads a prebuilt `better-sqlite3` binary for Electron 31 via `prebuild-install`.

### Run in development

```bash
npm run dev
```

### Build for production

```bash
npm run build       # electron-vite build only
npm run package     # build + create NSIS installer → release/
```

The installer is written to `release/File Integrity Checker Setup 1.0.0.exe`.

---

## How It Works

1. **Add a folder** — the app recursively walks every file and stores a SHA-256 hash + size in SQLite as the baseline.
2. **Run a scan** — the same walk runs again, each file's current hash is compared to the stored one, and every file is classified as `OK`, `MODIFIED`, `ADDED`, or `DELETED`.
3. **Enable live watch** — chokidar watches the folder's file-system events in real time. Each event re-hashes the affected file and fires a desktop notification if it differs from baseline.
4. **Set a schedule** — a node-cron job runs a silent full scan at the configured interval and notifies on any changes found.

---

## Security Notes

- All hashing is done in the main process (Node.js), never in the renderer.
- `contextIsolation: true` and `nodeIntegration: false` are enforced — the renderer has no direct Node.js access.
- The `contextBridge` exposes a minimal, named API surface (`window.api`) with no passthrough to `ipcRenderer` itself.
- SQLite uses WAL journal mode for safe concurrent reads during background scans.

---

## License

MIT — see [LICENSE](LICENSE)
