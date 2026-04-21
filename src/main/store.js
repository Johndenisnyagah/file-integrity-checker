import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const DEFAULTS = {
  excludePatterns: ['node_modules', '.git', '.DS_Store', 'Thumbs.db'],
}

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
    next.excludePatterns = settings.excludePatterns
  }
  write(next)
  return next
}
