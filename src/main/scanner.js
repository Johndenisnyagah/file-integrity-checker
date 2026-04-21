import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

function getAllFiles(dirPath, results = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      getAllFiles(full, results)
    } else {
      results.push(full)
    }
  }
  return results
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (d) => hash.update(d))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export async function scanFolder(folderPath, excludePatterns = [], onProgress) {
  let files
  try {
    files = getAllFiles(folderPath)
  } catch {
    return []
  }

  if (excludePatterns.length > 0) {
    files = files.filter((f) => !excludePatterns.some((p) => f.includes(p)))
  }

  const results = []
  for (let i = 0; i < files.length; i++) {
    onProgress?.({ current: i + 1, total: files.length, file: files[i] })
    try {
      const hash = await hashFile(files[i])
      const { size } = fs.statSync(files[i])
      results.push({ filePath: files[i], hash, size })
    } catch {
      results.push({ filePath: files[i], hash: null, size: 0, error: 'permission' })
    }
  }
  return results
}
