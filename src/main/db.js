import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db

export function getDb() {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'data.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    initSchema()
  }
  return db
}

function initSchema() {
  db.exec(`
    BEGIN;

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      watch_mode TEXT NOT NULL DEFAULT '["manual"]',
      schedule_interval TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS baseline_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      hash TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      baseline_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
      triggered_by TEXT NOT NULL,
      total_files INTEGER NOT NULL DEFAULT 0,
      changes_found INTEGER NOT NULL DEFAULT 0,
      scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scan_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      status TEXT NOT NULL,
      old_hash TEXT,
      new_hash TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_baseline_folder ON baseline_files(folder_id);
    CREATE INDEX IF NOT EXISTS idx_results_scan ON scan_results(scan_id);

    COMMIT;
  `)
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}
