/**
 * Tests for the IPC input-validation helpers extracted from handlers.js.
 * We test the behaviour that handlers exhibit — valid input passes through,
 * invalid input returns an error object — without needing to spin up Electron.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

// ── Mock Electron IPC + dialog so handlers.js can be imported ─────────────────
const registeredHandlers = {}

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel, fn) => { registeredHandlers[channel] = fn }),
  },
  dialog: {
    showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] })),
  },
  app: { getPath: vi.fn(() => require('os').tmpdir()) },
}))

// ── Provide an in-memory DB ────────────────────────────────────────────────────
let db

vi.mock('../src/main/db.js', () => ({ getDb: () => db }))
vi.mock('../src/main/scanner.js', () => ({
  scanFolder: vi.fn(async () => []),
  truncatePath: (p) => p,
}))
vi.mock('../src/main/baseline.js', () => ({
  writeBaseline: vi.fn(),
  readBaseline: vi.fn(() => []),
}))
vi.mock('../src/main/compare.js', () => ({
  compareToBaseline: vi.fn(() => []),
}))
vi.mock('../src/main/scheduler.js', () => ({
  setSchedule: vi.fn(),
  clearSchedule: vi.fn(),
}))
vi.mock('../src/main/watcher.js', () => ({
  startWatch: vi.fn(),
  stopWatch: vi.fn(),
  stopAll: vi.fn(),
}))
vi.mock('../src/main/store.js', () => ({
  getSettings: vi.fn(() => ({ excludePatterns: [] })),
  setSettings: vi.fn((s) => s),
}))

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
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER NOT NULL,
      triggered_by TEXT NOT NULL,
      total_files INTEGER NOT NULL DEFAULT 0,
      changes_found INTEGER NOT NULL DEFAULT 0,
      scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS scan_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      status TEXT NOT NULL,
      old_hash TEXT,
      new_hash TEXT
    );
  `)
}

// Import after all mocks are set up
const { registerHandlers } = await import('../src/main/handlers.js')

const fakeWindow = { webContents: { send: vi.fn(), isDestroyed: vi.fn(() => false) } }
const fakeNotify = vi.fn()

beforeEach(() => {
  db = new Database(':memory:')
  createSchema(db)
  // Re-register handlers with fresh DB
  Object.keys(registeredHandlers).forEach((k) => delete registeredHandlers[k])
  registerHandlers(fakeWindow, fakeNotify)
})

// Helper: invoke a registered handler as if ipcRenderer called it
function invoke(channel, ...args) {
  const handler = registeredHandlers[channel]
  if (!handler) throw new Error(`No handler for channel: ${channel}`)
  return handler({}, ...args)
}

// ── Input validation ───────────────────────────────────────────────────────────
describe('IPC handler input validation', () => {

  describe('create-baseline', () => {
    it('returns an error when folderPath is not a string', async () => {
      const result = await invoke('create-baseline', 42)
      expect(result).toHaveProperty('error')
    })

    it('returns an error when folderPath is an empty string', async () => {
      const result = await invoke('create-baseline', '   ')
      expect(result).toHaveProperty('error')
    })

    it('succeeds with a valid folder path', async () => {
      const result = await invoke('create-baseline', 'C:\\valid\\path')
      expect(result).toHaveProperty('success', true)
    })
  })

  describe('remove-folder', () => {
    it('returns an error for a non-integer id', async () => {
      expect(await invoke('remove-folder', 'abc')).toHaveProperty('error')
      expect(await invoke('remove-folder', 0)).toHaveProperty('error')
      expect(await invoke('remove-folder', -1)).toHaveProperty('error')
      expect(await invoke('remove-folder', 1.5)).toHaveProperty('error')
    })

    it('succeeds with a valid positive integer id', async () => {
      // Insert a folder first so the DELETE has something to act on
      db.prepare("INSERT INTO folders (path) VALUES ('C:\\test')").run()
      const result = await invoke('remove-folder', 1)
      expect(result).toHaveProperty('success', true)
    })
  })

  describe('get-history', () => {
    it('returns an empty array for invalid folderId', async () => {
      expect(await invoke('get-history', 'bad')).toEqual([])
      expect(await invoke('get-history', -5)).toEqual([])
    })

    it('returns an array for a valid folderId (even if no rows)', async () => {
      const result = await invoke('get-history', 999)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('get-scan-results', () => {
    it('returns an empty array for invalid scanId', async () => {
      expect(await invoke('get-scan-results', null)).toEqual([])
      expect(await invoke('get-scan-results', 0)).toEqual([])
    })

    it('returns an array for a valid scanId', async () => {
      const result = await invoke('get-scan-results', 1)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('run-scan', () => {
    it('returns an error when folderPath is not a string', async () => {
      const result = await invoke('run-scan', null)
      expect(result).toHaveProperty('error')
    })

    it('returns an error when folder is not in the DB', async () => {
      const result = await invoke('run-scan', 'C:\\unknown\\path')
      expect(result).toHaveProperty('error')
    })
  })

  describe('set-schedule', () => {
    it('returns an error when payload is null', async () => {
      expect(await invoke('set-schedule', null)).toHaveProperty('error')
    })

    it('returns an error when folderId is invalid', async () => {
      expect(await invoke('set-schedule', { folderId: 'x', interval: 'daily' })).toHaveProperty('error')
    })

    it('returns an error for an unknown interval string', async () => {
      db.prepare("INSERT INTO folders (path) VALUES ('C:\\test')").run()
      const result = await invoke('set-schedule', { folderId: 1, interval: 'every-second' })
      expect(result).toHaveProperty('error')
    })

    it('succeeds with manual interval (clears schedule)', async () => {
      db.prepare("INSERT INTO folders (path) VALUES ('C:\\test')").run()
      const result = await invoke('set-schedule', { folderId: 1, interval: 'manual' })
      expect(result).toHaveProperty('success', true)
    })
  })

  describe('clear-schedule', () => {
    it('returns an error for invalid folderId', async () => {
      expect(await invoke('clear-schedule', 'bad')).toHaveProperty('error')
    })

    it('succeeds with a valid folderId', async () => {
      db.prepare("INSERT INTO folders (path) VALUES ('C:\\test')").run()
      const result = await invoke('clear-schedule', 1)
      expect(result).toHaveProperty('success', true)
    })
  })

  describe('start-watch', () => {
    it('returns an error when folderPath is not a string', async () => {
      expect(await invoke('start-watch', 99)).toHaveProperty('error')
    })

    it('returns an error when folder is not in the DB', async () => {
      expect(await invoke('start-watch', 'C:\\not\\registered')).toHaveProperty('error')
    })

    it('succeeds when folder is registered', async () => {
      db.prepare("INSERT INTO folders (path) VALUES ('C:\\test')").run()
      const result = await invoke('start-watch', 'C:\\test')
      expect(result).toHaveProperty('success', true)
    })
  })

  describe('stop-watch', () => {
    it('returns an error for a non-string path', async () => {
      expect(await invoke('stop-watch', 123)).toHaveProperty('error')
    })

    it('succeeds with a valid path string', async () => {
      const result = await invoke('stop-watch', 'C:\\test')
      expect(result).toHaveProperty('success', true)
    })
  })

  describe('set-settings', () => {
    it('returns an error when settings is not an object', async () => {
      expect(await invoke('set-settings', 'bad')).toHaveProperty('error')
      expect(await invoke('set-settings', null)).toHaveProperty('error')
    })

    it('passes a valid settings object through', async () => {
      const result = await invoke('set-settings', { excludePatterns: ['node_modules'] })
      expect(result).not.toHaveProperty('error')
    })
  })
})
