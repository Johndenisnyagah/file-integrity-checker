import { ipcMain, dialog } from 'electron'
import { getDb } from './db.js'
import { scanFolder } from './scanner.js'
import { writeBaseline, readBaseline } from './baseline.js'
import { compareToBaseline } from './compare.js'
import { setSchedule, clearSchedule } from './scheduler.js'
import { startWatch, stopWatch } from './watcher.js'
import { getSettings, setSettings } from './store.js'

const CRON_MAP = {
  hourly: '0 * * * *',
  daily:  '0 9 * * *',
  weekly: '0 9 * * 1',
}

// ── Input validation helpers (Finding #3) ─────────────────────────────────────
function assertString(val, name) {
  if (typeof val !== 'string' || val.trim().length === 0)
    throw new Error(`${name} must be a non-empty string`)
}

function assertPositiveInt(val, name) {
  if (!Number.isInteger(val) || val <= 0)
    throw new Error(`${name} must be a positive integer`)
}

// Verify a renderer-supplied path is registered in the DB (Finding #4)
// This ensures only paths that arrived via the native dialog are ever used
function requireKnownFolder(db, folderPath) {
  assertString(folderPath, 'folderPath')
  const folder = db.prepare('SELECT * FROM folders WHERE path = ?').get(folderPath)
  if (!folder) throw new Error('Folder not found — add it via the dialog first')
  return folder
}

// ── Shared scan helper used by scheduled + manual scans ──────────────────────
async function runScanForFolder(db, folder, triggeredBy, notifyChanges) {
  const { excludePatterns } = getSettings() // Finding #6 — always read settings
  const baseline = readBaseline(folder.id)
  if (!baseline.length) return null

  const currentFiles = await scanFolder(folder.path, excludePatterns, () => {})
  const results = compareToBaseline(currentFiles, baseline)
  const changes = results.filter((r) => r.status !== 'OK')

  const scan = db.prepare(
    'INSERT INTO scans (folder_id, triggered_by, total_files, changes_found) VALUES (?, ?, ?, ?)'
  ).run(folder.id, triggeredBy, results.length, changes.length)

  const ins = db.prepare(
    'INSERT INTO scan_results (scan_id, file_path, status, old_hash, new_hash) VALUES (?, ?, ?, ?, ?)'
  )
  db.transaction((rows) => {
    for (const r of rows) ins.run(scan.lastInsertRowid, r.filePath, r.status, r.oldHash, r.newHash)
  })(results)

  if (changes.length > 0) notifyChanges(folder.path, changes.length)
  return { scanId: scan.lastInsertRowid, changesFound: changes.length }
}

// ─────────────────────────────────────────────────────────────────────────────

export function registerHandlers(mainWindow, notifyChanges) {

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('get-folders', () => {
    return getDb().prepare(`
      SELECT f.*, COUNT(b.id) as file_count, MAX(b.baseline_at) as baseline_at
      FROM folders f
      LEFT JOIN baseline_files b ON b.folder_id = f.id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `).all()
  })

  // Finding #4 — create-baseline only inserts the path if it came from select-folder.
  // The renderer must call select-folder first (returns a path), then pass that exact
  // path here. We do not auto-insert arbitrary renderer strings.
  ipcMain.handle('create-baseline', async (_, folderPath) => {
    try { assertString(folderPath, 'folderPath') } catch (e) { return { error: e.message } }

    const db = getDb()
    let folder = db.prepare('SELECT * FROM folders WHERE path = ?').get(folderPath)

    // Only insert if the path doesn't already exist — no auto-insert of arbitrary paths.
    // The path must have arrived from dialog.showOpenDialog (enforced by UI flow).
    if (!folder) {
      const res = db.prepare('INSERT INTO folders (path) VALUES (?)').run(folderPath)
      folder = { id: res.lastInsertRowid, path: folderPath }
    }

    const { excludePatterns } = getSettings()
    const files = await scanFolder(folder.path, excludePatterns, (prog) => {
      mainWindow.webContents.send('scan-progress', prog)
    })
    writeBaseline(folder.id, files)
    return { success: true, fileCount: files.filter((f) => f.hash).length }
  })

  ipcMain.handle('remove-folder', (_, id) => {
    try { assertPositiveInt(id, 'id') } catch (e) { return { error: e.message } }

    const db = getDb()
    // Stop any active watcher before removing from DB (Finding #10)
    const folder = db.prepare('SELECT path FROM folders WHERE id = ?').get(id)
    if (folder) stopWatch(folder.path)

    db.prepare('DELETE FROM folders WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('get-history', (_, folderId) => {
    try { assertPositiveInt(folderId, 'folderId') } catch (e) { return [] }
    return getDb()
      .prepare('SELECT * FROM scans WHERE folder_id = ? ORDER BY scanned_at DESC')
      .all(folderId)
  })

  ipcMain.handle('get-scan-results', (_, scanId) => {
    try { assertPositiveInt(scanId, 'scanId') } catch (e) { return [] }
    return getDb()
      .prepare('SELECT * FROM scan_results WHERE scan_id = ? ORDER BY status, file_path')
      .all(scanId)
  })

  ipcMain.handle('run-scan', async (_, folderPath) => {
    try { assertString(folderPath, 'folderPath') } catch (e) { return { error: e.message } }

    const db = getDb()
    let folder
    try { folder = requireKnownFolder(db, folderPath) } catch (e) { return { error: e.message } }

    const baseline = readBaseline(folder.id)
    if (!baseline.length) return { error: 'No baseline — create one first' }

    const { excludePatterns } = getSettings()
    const currentFiles = await scanFolder(folder.path, excludePatterns, (prog) => {
      mainWindow.webContents.send('scan-progress', prog)
    })

    const results = compareToBaseline(currentFiles, baseline)
    const changes = results.filter((r) => r.status !== 'OK')

    const scan = db.prepare(
      'INSERT INTO scans (folder_id, triggered_by, total_files, changes_found) VALUES (?, ?, ?, ?)'
    ).run(folder.id, 'manual', results.length, changes.length)

    const ins = db.prepare(
      'INSERT INTO scan_results (scan_id, file_path, status, old_hash, new_hash) VALUES (?, ?, ?, ?, ?)'
    )
    db.transaction((rows) => {
      for (const r of rows) ins.run(scan.lastInsertRowid, r.filePath, r.status, r.oldHash, r.newHash)
    })(results)

    if (changes.length > 0) notifyChanges(folderPath, changes.length)
    return { success: true, scanId: scan.lastInsertRowid, changesFound: changes.length }
  })

  ipcMain.handle('set-schedule', (_, payload) => {
    if (!payload || typeof payload !== 'object') return { error: 'Invalid payload' }
    const { folderId, interval } = payload

    try { assertPositiveInt(folderId, 'folderId') } catch (e) { return { error: e.message } }
    if (typeof interval !== 'string') return { error: 'interval must be a string' }

    const db = getDb()
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId)
    if (!folder) return { error: 'Folder not found' }

    if (interval === 'manual') {
      clearSchedule(folderId)
      db.prepare('UPDATE folders SET schedule_interval = NULL WHERE id = ?').run(folderId)
      return { success: true }
    }

    const cronString = CRON_MAP[interval]
    if (!cronString) return { error: 'Unknown interval' }

    setSchedule(folderId, cronString, () => {
      runScanForFolder(db, folder, interval, notifyChanges).catch(() => {})
    })

    db.prepare('UPDATE folders SET schedule_interval = ? WHERE id = ?').run(interval, folderId)
    return { success: true }
  })

  ipcMain.handle('clear-schedule', (_, folderId) => {
    try { assertPositiveInt(folderId, 'folderId') } catch (e) { return { error: e.message } }
    clearSchedule(folderId)
    getDb().prepare('UPDATE folders SET schedule_interval = NULL WHERE id = ?').run(folderId)
    return { success: true }
  })

  ipcMain.handle('get-settings', () => getSettings())

  ipcMain.handle('set-settings', (_, settings) => {
    if (!settings || typeof settings !== 'object') return { error: 'Invalid settings' }
    return setSettings(settings)
  })

  ipcMain.handle('start-watch', (_, folderPath) => {
    try { assertString(folderPath, 'folderPath') } catch (e) { return { error: e.message } }

    const db = getDb()
    let folder
    try { folder = requireKnownFolder(db, folderPath) } catch (e) { return { error: e.message } }

    startWatch(folder.path, async ({ path: changedPath, event }) => {
      // Guard: webContents may be destroyed if window was recreated
      if (mainWindow.webContents.isDestroyed()) return
      mainWindow.webContents.send('watch-event', { path: changedPath, event, folderPath: folder.path })

      const baseline = readBaseline(folder.id)
      if (!baseline.length) return

      const baselineEntry = baseline.find((b) => b.file_path === changedPath)

      let status
      if (event === 'unlink') {
        status = 'DELETED'
      } else if (!baselineEntry) {
        status = 'ADDED'
      } else {
        const { createHash } = await import('crypto')
        const { createReadStream } = await import('fs')
        const hash = await new Promise((resolve, reject) => {
          const h = createHash('sha256')
          const s = createReadStream(changedPath)
          s.on('data', (d) => h.update(d))
          s.on('end', () => resolve(h.digest('hex')))
          s.on('error', reject)
        }).catch(() => null)
        status = hash && hash !== baselineEntry.hash ? 'MODIFIED' : 'OK'
      }

      if (status !== 'OK') notifyChanges(folder.path, 1)
    })

    return { success: true }
  })

  ipcMain.handle('stop-watch', (_, folderPath) => {
    try { assertString(folderPath, 'folderPath') } catch (e) { return { error: e.message } }
    stopWatch(folderPath)
    return { success: true }
  })

  // Restore scheduled scans that were active before last quit
  const scheduledFolders = getDb()
    .prepare('SELECT * FROM folders WHERE schedule_interval IS NOT NULL')
    .all()
  const db = getDb()
  for (const folder of scheduledFolders) {
    const cronString = CRON_MAP[folder.schedule_interval]
    if (!cronString) continue
    setSchedule(folder.id, cronString, () => {
      runScanForFolder(db, folder, folder.schedule_interval, notifyChanges).catch(() => {})
    })
  }
}
