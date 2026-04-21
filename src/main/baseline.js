import { getDb } from './db.js'

export function writeBaseline(folderId, scanResults) {
  const db = getDb()
  const deleteStmt = db.prepare('DELETE FROM baseline_files WHERE folder_id = ?')
  const insertStmt = db.prepare(
    'INSERT INTO baseline_files (folder_id, file_path, hash, file_size) VALUES (?, ?, ?, ?)'
  )
  const writeAll = db.transaction((results) => {
    deleteStmt.run(folderId)
    for (const r of results) {
      if (r.hash) {
        insertStmt.run(folderId, r.filePath, r.hash, r.size)
      }
    }
  })
  writeAll(scanResults)
}

export function readBaseline(folderId) {
  return getDb()
    .prepare('SELECT * FROM baseline_files WHERE folder_id = ?')
    .all(folderId)
}
