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
  daily: '0 9 * * *',
  weekly: '0 9 * * 1',
}

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

  ipcMain.handle('create-baseline', async (_, folderPath) => {
    const db = getDb()
    let folder = db.prepare('SELECT * FROM folders WHERE path = ?').get(folderPath)
    if (!folder) {
      const res = db.prepare('INSERT INTO folders (path) VALUES (?)').run(folderPath)
      folder = { id: res.lastInsertRowid, path: folderPath }
    }
    const { excludePatterns } = getSettings()
    const files = await scanFolder(folderPath, excludePatterns, (prog) => {
      mainWindow.webContents.send('scan-progress', prog)
    })
    writeBaseline(folder.id, files)
    return { success: true, fileCount: files.filter((f) => f.hash).length }
  })

  ipcMain.handle('remove-folder', (_, id) => {
    getDb().prepare('DELETE FROM folders WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('get-history', (_, folderId) => {
    return getDb()
      .prepare('SELECT * FROM scans WHERE folder_id = ? ORDER BY scanned_at DESC')
      .all(folderId)
  })

  ipcMain.handle('get-scan-results', (_, scanId) => {
    return getDb()
      .prepare('SELECT * FROM scan_results WHERE scan_id = ? ORDER BY status, file_path')
      .all(scanId)
  })

  ipcMain.handle('run-scan', async (_, folderPath) => {
    const db = getDb()
    const folder = db.prepare('SELECT * FROM folders WHERE path = ?').get(folderPath)
    if (!folder) return { error: 'Folder not found — add it first' }

    const baseline = readBaseline(folder.id)
    if (!baseline.length) return { error: 'No baseline — create one first' }

    const { excludePatterns } = getSettings()
    const currentFiles = await scanFolder(folderPath, excludePatterns, (prog) => {
      mainWindow.webContents.send('scan-progress', prog)
    })

    const results = compareToBaseline(currentFiles, baseline)
    const changes = results.filter((r) => r.status !== 'OK')

    const scan = db.prepare(
      'INSERT INTO scans (folder_id, triggered_by, total_files, changes_found) VALUES (?, ?, ?, ?)'
    ).run(folder.id, 'manual', results.length, changes.length)

    const insertResult = db.prepare(
      'INSERT INTO scan_results (scan_id, file_path, status, old_hash, new_hash) VALUES (?, ?, ?, ?, ?)'
    )
    const insertAll = db.transaction((rows) => {
      for (const r of rows) {
        insertResult.run(scan.lastInsertRowid, r.filePath, r.status, r.oldHash, r.newHash)
      }
    })
    insertAll(results)

    if (changes.length > 0) {
      notifyChanges(folderPath, changes.length)
    }

    return { success: true, scanId: scan.lastInsertRowid, changesFound: changes.length }
  })
  ipcMain.handle('set-schedule', (_, { folderId, interval }) => {
    const db = getDb()
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId)
    if (!folder) return { error: 'Folder not found' }

    if (interval === 'manual') {
      clearSchedule(folderId)
      db.prepare("UPDATE folders SET schedule_interval = NULL WHERE id = ?").run(folderId)
      return { success: true }
    }

    const cronString = CRON_MAP[interval]
    if (!cronString) return { error: 'Unknown interval' }

    setSchedule(folderId, cronString, async () => {
      const baseline = readBaseline(folderId)
      if (!baseline.length) return
      const currentFiles = await scanFolder(folder.path, [], () => {})
      const results = compareToBaseline(currentFiles, baseline)
      const changes = results.filter((r) => r.status !== 'OK')
      const scan = db.prepare(
        'INSERT INTO scans (folder_id, triggered_by, total_files, changes_found) VALUES (?, ?, ?, ?)'
      ).run(folderId, interval, results.length, changes.length)
      const ins = db.prepare(
        'INSERT INTO scan_results (scan_id, file_path, status, old_hash, new_hash) VALUES (?, ?, ?, ?, ?)'
      )
      db.transaction((rows) => {
        for (const r of rows) ins.run(scan.lastInsertRowid, r.filePath, r.status, r.oldHash, r.newHash)
      })(results)
      if (changes.length > 0) notifyChanges(folder.path, changes.length)
    })

    db.prepare('UPDATE folders SET schedule_interval = ? WHERE id = ?').run(interval, folderId)
    return { success: true }
  })

  ipcMain.handle('clear-schedule', (_, folderId) => {
    clearSchedule(folderId)
    getDb().prepare('UPDATE folders SET schedule_interval = NULL WHERE id = ?').run(folderId)
    return { success: true }
  })

  // Restore active schedules after restart
  const scheduledFolders = getDb().prepare('SELECT * FROM folders WHERE schedule_interval IS NOT NULL').all()
  for (const folder of scheduledFolders) {
    const cronString = CRON_MAP[folder.schedule_interval]
    if (!cronString) continue
    const db = getDb()
    setSchedule(folder.id, cronString, async () => {
      const baseline = readBaseline(folder.id)
      if (!baseline.length) return
      const currentFiles = await scanFolder(folder.path, [], () => {})
      const results = compareToBaseline(currentFiles, baseline)
      const changes = results.filter((r) => r.status !== 'OK')
      const scan = db.prepare(
        'INSERT INTO scans (folder_id, triggered_by, total_files, changes_found) VALUES (?, ?, ?, ?)'
      ).run(folder.id, folder.schedule_interval, results.length, changes.length)
      const ins = db.prepare(
        'INSERT INTO scan_results (scan_id, file_path, status, old_hash, new_hash) VALUES (?, ?, ?, ?, ?)'
      )
      db.transaction((rows) => {
        for (const r of rows) ins.run(scan.lastInsertRowid, r.filePath, r.status, r.oldHash, r.newHash)
      })(results)
      if (changes.length > 0) notifyChanges(folder.path, changes.length)
    })
  }

  ipcMain.handle('get-settings', () => getSettings())

  ipcMain.handle('set-settings', (_, settings) => setSettings(settings))

  ipcMain.handle('start-watch', (_, folderPath) => {
    const db = getDb()
    const folder = db.prepare('SELECT * FROM folders WHERE path = ?').get(folderPath)
    if (!folder) return { error: 'Folder not found' }

    startWatch(folderPath, async ({ path: changedPath, event }) => {
      mainWindow.webContents.send('watch-event', { path: changedPath, event, folderPath })

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

      if (status !== 'OK') {
        notifyChanges(folderPath, 1)
      }
    })

    return { success: true }
  })

  ipcMain.handle('stop-watch', (_, folderPath) => {
    stopWatch(folderPath)
    return { success: true }
  })
}
