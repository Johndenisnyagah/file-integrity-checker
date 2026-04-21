import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const MAX_FILES = 500_000
const MAX_DEPTH = 50

// Iterative walk — avoids stack overflow on deep trees (Finding #7)
// Skips symlinks to prevent directory escape and infinite loops (Finding #5)
function getAllFiles(startPath) {
  const queue = [{ dir: startPath, depth: 0 }]
  const results = []

  while (queue.length > 0 && results.length < MAX_FILES) {
    const { dir, depth } = queue.shift()
    if (depth > MAX_DEPTH) continue

    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue // permission denied or directory gone — skip silently
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue // never follow symlinks (Finding #5)
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        queue.push({ dir: full, depth: depth + 1 })
      } else {
        results.push(full)
      }
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

// Truncate long paths before sending over IPC (Finding #12)
export function truncatePath(p, max = 500) {
  if (!p || p.length <= max) return p
  return '\u2026' + p.slice(-(max - 1))
}

export async function scanFolder(folderPath, excludePatterns = [], onProgress) {
  let files
  try {
    files = getAllFiles(folderPath)
  } catch {
    return []
  }

  // Only apply patterns that are valid strings of useful length (Finding #8)
  const validPatterns = (excludePatterns || []).filter(
    (p) => typeof p === 'string' && p.length >= 2
  )

  if (validPatterns.length > 0) {
    files = files.filter((f) => !validPatterns.some((p) => f.includes(p)))
  }

  const results = []
  for (let i = 0; i < files.length; i++) {
    onProgress?.({
      current: i + 1,
      total: files.length,
      file: truncatePath(files[i]), // Finding #12
    })
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
