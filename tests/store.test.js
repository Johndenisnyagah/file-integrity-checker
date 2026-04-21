import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// ── Mock electron's app.getPath before importing store ────────────────────────
let tmpDir

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => tmpDir),
  },
}))

// Import after mock is set up
const { getSettings, setSettings } = await import('../src/main/store.js')

describe('store', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fic-store-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    vi.clearAllMocks()
  })

  // ── getSettings ─────────────────────────────────────────────────────────────
  describe('getSettings', () => {
    it('returns default excludePatterns when no settings file exists', () => {
      const settings = getSettings()
      expect(settings.excludePatterns).toEqual(
        expect.arrayContaining(['node_modules', '.git', '.DS_Store', 'Thumbs.db'])
      )
    })

    it('merges stored settings with defaults', () => {
      const stored = { excludePatterns: ['custom'] }
      fs.writeFileSync(path.join(tmpDir, 'settings.json'), JSON.stringify(stored))
      const settings = getSettings()
      expect(settings.excludePatterns).toEqual(['custom'])
    })

    it('returns defaults when settings file contains invalid JSON', () => {
      fs.writeFileSync(path.join(tmpDir, 'settings.json'), '{not valid json}')
      const settings = getSettings()
      expect(settings.excludePatterns).toBeDefined()
      expect(Array.isArray(settings.excludePatterns)).toBe(true)
    })
  })

  // ── setSettings ─────────────────────────────────────────────────────────────
  describe('setSettings', () => {
    it('persists valid exclude patterns to disk', () => {
      setSettings({ excludePatterns: ['node_modules', '.git'] })
      const stored = JSON.parse(fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf8'))
      expect(stored.excludePatterns).toEqual(['node_modules', '.git'])
    })

    it('returns the validated settings after saving', () => {
      const result = setSettings({ excludePatterns: ['abc', 'def'] })
      expect(result.excludePatterns).toEqual(['abc', 'def'])
    })

    it('enforces the maximum of 100 patterns', () => {
      const many = Array.from({ length: 150 }, (_, i) => `pattern${i}`)
      const result = setSettings({ excludePatterns: many })
      expect(result.excludePatterns).toHaveLength(100)
    })

    it('rejects patterns shorter than 2 characters', () => {
      const result = setSettings({ excludePatterns: ['ab', 'x', 'cd'] })
      expect(result.excludePatterns).toEqual(['ab', 'cd'])
    })

    it('rejects patterns longer than 200 characters', () => {
      const tooLong = 'a'.repeat(201)
      const result = setSettings({ excludePatterns: ['valid', tooLong] })
      expect(result.excludePatterns).toEqual(['valid'])
    })

    it('rejects the backslash pattern that would match every Windows path', () => {
      const result = setSettings({ excludePatterns: ['\\', 'valid'] })
      expect(result.excludePatterns).toEqual(['valid'])
    })

    it('rejects the forward-slash pattern that would match every path', () => {
      const result = setSettings({ excludePatterns: ['/', 'valid'] })
      expect(result.excludePatterns).toEqual(['valid'])
    })

    it('rejects non-string items in the array', () => {
      const result = setSettings({ excludePatterns: ['valid', null, 42, {}, undefined, 'also-valid'] })
      expect(result.excludePatterns).toEqual(['valid', 'also-valid'])
    })

    it('ignores settings with no excludePatterns key', () => {
      setSettings({ excludePatterns: ['initial'] })
      setSettings({ unrelated: true }) // should not clear patterns
      const settings = getSettings()
      expect(settings.excludePatterns).toEqual(['initial'])
    })

    it('accepts exactly 2-character patterns (boundary)', () => {
      const result = setSettings({ excludePatterns: ['ab'] })
      expect(result.excludePatterns).toContain('ab')
    })

    it('accepts exactly 200-character patterns (boundary)', () => {
      const boundary = 'a'.repeat(200)
      const result = setSettings({ excludePatterns: [boundary] })
      expect(result.excludePatterns).toContain(boundary)
    })

    it('handles an empty array — clears all patterns', () => {
      setSettings({ excludePatterns: ['node_modules'] })
      const result = setSettings({ excludePatterns: [] })
      expect(result.excludePatterns).toEqual([])
    })
  })
})
