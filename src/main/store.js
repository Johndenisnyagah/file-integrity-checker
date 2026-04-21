import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const DEFAULTS = {
  excludePatterns: ['node_modules', '.git', '.DS_Store', 'Thumbs.db'],
}

const MAX_PATTERNS = 100
const MIN_PATTERN_LEN = 2
const MAX_PATTERN_LEN = 200

function getStorePath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function read() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(getStorePath(), 'utf8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

function write(data) {
  fs.writeFileSync(getStorePath(), JSON.stringify(data, null, 2), 'utf8')
}

export function getSettings() {
  return read()
}

export function setSettings(settings) {
  const current = read()
  const next = { ...current }

  if (Array.isArray(settings.excludePatterns)) {
    // Finding #9 — validate each element: type, length, count, no trivial wildcards
    const validated = settings.excludePatterns
      .slice(0, MAX_PATTERNS)
      .filter((p) =>
        typeof p === 'string' &&
        p.length >= MIN_PATTERN_LEN &&
        p.length <= MAX_PATTERN_LEN &&
        p !== '\\' && p !== '/' // patterns that match everything
      )
    next.excludePatterns = validated
  }

  write(next)
  return next
}
