# Changelog

All notable changes to this project are documented here.

---

## [1.0.0] — 2024

### Phase 10 — Packaging
- electron-builder NSIS installer targeting Windows x64
- Custom shield icon generated programmatically (PNG + ICO)
- `asarUnpack` configured for better-sqlite3 native module
- `npmRebuild: false` — uses prebuilt binary from `prebuild-install`
- Output: `release/File Integrity Checker Setup 1.0.0.exe`

### Phase 9 — Settings & Exclusions
- Settings view with exclude patterns management (add / remove)
- Patterns persisted to `settings.json` in `userData` via custom JSON store
- Exclude patterns applied to all baseline creation and scan operations
- Replaced `electron-store` (ESM-only, incompatible with Rollup CJS output) with a lightweight `fs`-based JSON store

### Phase 8 — System Tray & Notifications
- App hides to system tray on window close (does not quit)
- Tray context menu: Show / Quit
- Desktop notifications via Electron `Notification` API on detected changes
- Notification shows folder path and change count

### Phase 7 — Real-time Watching
- chokidar watcher registry (`watcher.js`) — one watcher per folder path
- Eye icon toggle on each folder card — green "● Live" indicator when active
- Per-event SHA-256 re-hash of changed file, compared to baseline entry
- `watch-event` IPC push event streams to renderer; last event shown on card
- Desktop notification fired for any non-OK event

### Phase 6 — Scheduled Scans
- node-cron job registry (`scheduler.js`) — one job per folder
- Schedule dropdown on folder card: Manual / Hourly / Daily / Weekly
- Cron strings: hourly `0 * * * *`, daily `0 9 * * *`, weekly `0 9 * * 1`
- Active schedules persisted to `folders.schedule_interval` and restored on restart
- Scheduled scans write to `scans` table with `triggered_by` = interval name

### Phase 5 — History View
- History view lists all scans for a folder (date, trigger, file count, changes)
- Changes count coloured green (0) or amber (>0)
- View button navigates to per-scan ScanResults
- Accessible via History button on folder card or sidebar nav

### Phase 4 — Manual Scan & Results View
- `run-scan` IPC handler: reads baseline, walks folder, diffs, writes to `scans` + `scan_results`
- `compareToBaseline()` classifies each file as OK / MODIFIED / ADDED / DELETED
- ScanResults view with status filter tabs (ALL / MODIFIED / ADDED / DELETED / OK)
- StatusBadge component with colour-coded pill for each status
- Scan button + Rebaseline button on each folder card
- Desktop notification fired when changes are found

### Phase 3 — Folder Selection & Baseline Creation
- Folder picker via Electron `dialog.showOpenDialog`
- `create-baseline` IPC handler: inserts folder, scans, writes SHA-256 hashes to `baseline_files`
- ProgressBar component streams scan progress events via `scan-progress` IPC push
- Folder cards on Dashboard show path, file count, and baseline timestamp
- Remove folder button with cascade delete

### Phase 2 — Design System & Shell UI
- Full CSS custom property design system (dark theme, `--bg-base: #0d0d0d`)
- App shell: fixed 220 px sidebar + scrollable main content area
- Sidebar with shield logo, nav items with active-state left border accent
- Components: `StatusBadge`, `ProgressBar`, `EmptyState`, `Sidebar`
- View placeholders: Dashboard, History, ScanResults, Settings

### Phase 1 — Scaffold & Dependencies
- electron-vite 2 project scaffold (main / preload / renderer)
- Electron 31, React 18, better-sqlite3 11, chokidar 3, node-cron 3
- `contextBridge` preload exposing `window.api` with all 11 named channels
- SQLite schema: `folders`, `baseline_files`, `scans`, `scan_results` with CASCADE deletes, WAL mode, indexes
- System tray scaffolding with icon and Show/Quit menu
- `postinstall` script downloads prebuilt better-sqlite3 binary for Electron 31 via `prebuild-install`
- Fixed V8 API incompatibility: upgraded better-sqlite3 from v9 to v11
- Fixed ESM bundling: converted all main-process files from CJS to ESM
