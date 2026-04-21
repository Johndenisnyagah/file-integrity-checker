import { describe, it, expect } from 'vitest'
import { compareToBaseline } from '../src/main/compare.js'

// baseline rows use file_path + hash (DB column names)
// current rows use filePath + hash (scanner output)

describe('compareToBaseline', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(compareToBaseline([], [])).toEqual([])
  })

  it('marks a file as OK when hash matches baseline', () => {
    const baseline = [{ file_path: 'C:\\dir\\a.txt', hash: 'abc123' }]
    const current  = [{ filePath:  'C:\\dir\\a.txt', hash: 'abc123' }]
    const results = compareToBaseline(current, baseline)
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ filePath: 'C:\\dir\\a.txt', status: 'OK' })
  })

  it('marks a file as MODIFIED when hash differs', () => {
    const baseline = [{ file_path: 'C:\\dir\\a.txt', hash: 'old' }]
    const current  = [{ filePath:  'C:\\dir\\a.txt', hash: 'new' }]
    const results = compareToBaseline(current, baseline)
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      filePath: 'C:\\dir\\a.txt',
      status: 'MODIFIED',
      oldHash: 'old',
      newHash: 'new',
    })
  })

  it('marks a file as ADDED when it is not in baseline', () => {
    const baseline = []
    const current  = [{ filePath: 'C:\\dir\\new.txt', hash: 'abc' }]
    const results = compareToBaseline(current, baseline)
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      filePath: 'C:\\dir\\new.txt',
      status: 'ADDED',
      oldHash: null,
      newHash: 'abc',
    })
  })

  it('marks a file as DELETED when it is in baseline but not current', () => {
    const baseline = [{ file_path: 'C:\\dir\\gone.txt', hash: 'xyz' }]
    const current  = []
    const results = compareToBaseline(current, baseline)
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      filePath: 'C:\\dir\\gone.txt',
      status: 'DELETED',
      oldHash: 'xyz',
      newHash: null,
    })
  })

  it('handles a mixed scenario correctly', () => {
    const baseline = [
      { file_path: 'C:\\ok.txt',       hash: 'same' },
      { file_path: 'C:\\modified.txt', hash: 'old'  },
      { file_path: 'C:\\deleted.txt',  hash: 'del'  },
    ]
    const current = [
      { filePath: 'C:\\ok.txt',       hash: 'same' },
      { filePath: 'C:\\modified.txt', hash: 'new'  },
      { filePath: 'C:\\added.txt',    hash: 'add'  },
    ]
    const results = compareToBaseline(current, baseline)
    const byPath = Object.fromEntries(results.map((r) => [r.filePath, r.status]))

    expect(byPath['C:\\ok.txt']).toBe('OK')
    expect(byPath['C:\\modified.txt']).toBe('MODIFIED')
    expect(byPath['C:\\added.txt']).toBe('ADDED')
    expect(byPath['C:\\deleted.txt']).toBe('DELETED')
    expect(results).toHaveLength(4)
  })

  it('handles duplicate file paths by using the last entry (Map semantics)', () => {
    // If baseline has two entries for the same path, last one wins in the Map
    const baseline = [
      { file_path: 'C:\\dup.txt', hash: 'first'  },
      { file_path: 'C:\\dup.txt', hash: 'second' },
    ]
    const current = [{ filePath: 'C:\\dup.txt', hash: 'second' }]
    const results = compareToBaseline(current, baseline)
    expect(results[0].status).toBe('OK')
  })

  it('preserves the old hash on MODIFIED entries', () => {
    const baseline = [{ file_path: 'C:\\f.txt', hash: 'aaa' }]
    const current  = [{ filePath:  'C:\\f.txt', hash: 'bbb' }]
    const [r] = compareToBaseline(current, baseline)
    expect(r.oldHash).toBe('aaa')
    expect(r.newHash).toBe('bbb')
  })

  it('handles a large set of files without error', () => {
    const count = 10_000
    const baseline = Array.from({ length: count }, (_, i) => ({
      file_path: `C:\\file${i}.txt`,
      hash: `hash${i}`,
    }))
    const current = baseline.map((b) => ({ filePath: b.file_path, hash: b.hash }))
    const results = compareToBaseline(current, baseline)
    expect(results).toHaveLength(count)
    expect(results.every((r) => r.status === 'OK')).toBe(true)
  })
})
