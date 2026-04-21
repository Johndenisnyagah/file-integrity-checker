import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import Database from 'better-sqlite3'

// ── Provide a real in-memory SQLite DB, bypassing app.getPath ─────────────────
let db

vi.mock('../src/main/db.js', () => ({
  getDb: () => db,
}))

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => os.tmpdir()) },
}))

const { writeBaseline, readBaseline } = await import('../src/main/baseline.js')

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      watch_mode TEXT NOT NULL DEFAULT '"manual"',
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
  `)
}

describe('baseline', () => {
  beforeEach(() => {
    db = new Database(':memory:')
    createSchema(db)
    db.prepare("INSERT INTO folders (path) VALUES ('C:\\test')").run()
  })

  afterEach(() => {
    db.close()
  })

  const folderId = 1

  // ── writeBaseline ──────────────────────────────────────────────────────────
  describe('writeBaseline', () => {
    it('inserts scan results into baseline_files', () => {
      writeBaseline(folderId, [
        { filePath: 'C:\\test\\a.txt', hash: 'aaa', size: 10 },
        { filePath: 'C:\\test\\b.txt', hash: 'bbb', size: 20 },
      ])
      const rows = db.prepare('SELECT * FROM baseline_files WHERE folder_id = ?').all(folderId)
      expect(rows).toHaveLength(2)
    })

    it('stores the correct file_path, hash, and file_size', () => {
      writeBaseline(folderId, [{ filePath: 'C:\\test\\file.txt', hash: 'deadbeef', size: 42 }])
      const row = db.prepare('SELECT * FROM baseline_files WHERE folder_id = ?').get(folderId)
      expect(row.file_path).toBe('C:\\test\\file.txt')
      expect(row.hash).toBe('deadbeef')
      expect(row.file_size).toBe(42)
    })

    it('skips entries where hash is null (unreadable files)', () => {
      writeBaseline(folderId, [
        { filePath: 'C:\\test\\ok.txt',  hash: 'abc', size: 5 },
        { filePath: 'C:\\test\\bad.txt', hash: null,  size: 0 },
      ])
      const rows = db.prepare('SELECT * FROM baseline_files WHERE folder_id = ?').all(folderId)
      expect(rows).toHaveLength(1)
      expect(rows[0].file_path).toBe('C:\\test\\ok.txt')
    })

    it('replaces the existing baseline on re-run (idempotent)', () => {
      writeBaseline(folderId, [{ filePath: 'C:\\test\\v1.txt', hash: 'v1', size: 1 }])
      writeBaseline(folderId, [{ filePath: 'C:\\test\\v2.txt', hash: 'v2', size: 2 }])

      const rows = db.prepare('SELECT * FROM baseline_files WHERE folder_id = ?').all(folderId)
      expect(rows).toHaveLength(1)
      expect(rows[0].file_path).toBe('C:\\test\\v2.txt')
    })

    it('handles an empty scan result (no files in folder)', () => {
      writeBaseline(folderId, [])
      const rows = db.prepare('SELECT * FROM baseline_files WHERE folder_id = ?').all(folderId)
      expect(rows).toHaveLength(0)
    })

    it('is atomic — either all rows or none are written (transaction)', () => {
      // After a successful write, the previous baseline should be fully gone
      writeBaseline(folderId, [
        { filePath: 'C:\\test\\old1.txt', hash: 'o1', size: 1 },
        { filePath: 'C:\\test\\old2.txt', hash: 'o2', size: 2 },
      ])

      writeBaseline(folderId, [
        { filePath: 'C:\\test\\new.txt', hash: 'n1', size: 3 },
      ])

      const rows = db.prepare('SELECT * FROM baseline_files WHERE folder_id = ?').all(folderId)
      // old1 and old2 must be gone; only new.txt remains
      expect(rows.map((r) => r.file_path)).toEqual(['C:\\test\\new.txt'])
    })
  })

  // ── readBaseline ───────────────────────────────────────────────────────────
  describe('readBaseline', () => {
    it('returns an empty array when no baseline exists', () => {
      expect(readBaseline(folderId)).toEqual([])
    })

    it('returns all rows for the given folder', () => {
      writeBaseline(folderId, [
        { filePath: 'C:\\test\\a.txt', hash: 'aaa', size: 1 },
        { filePath: 'C:\\test\\b.txt', hash: 'bbb', size: 2 },
      ])
      const rows = readBaseline(folderId)
      expect(rows).toHaveLength(2)
    })

    it('only returns rows for the specified folderId', () => {
      db.prepare("INSERT INTO folders (path) VALUES ('C:\\other')").run()
      const otherFolderId = 2

      writeBaseline(folderId,      [{ filePath: 'C:\\test\\a.txt',  hash: 'aaa', size: 1 }])
      writeBaseline(otherFolderId, [{ filePath: 'C:\\other\\b.txt', hash: 'bbb', size: 2 }])

      const rows = readBaseline(folderId)
      expect(rows).toHaveLength(1)
      expect(rows[0].file_path).toBe('C:\\test\\a.txt')
    })

    it('returns rows with file_path, hash, and file_size fields', () => {
      writeBaseline(folderId, [{ filePath: 'C:\\test\\x.txt', hash: 'hhh', size: 99 }])
      const [row] = readBaseline(folderId)
      expect(row).toHaveProperty('file_path')
      expect(row).toHaveProperty('hash')
      expect(row).toHaveProperty('file_size')
    })

    it('returns empty array for a non-existent folderId', () => {
      expect(readBaseline(9999)).toEqual([])
    })
  })
})
