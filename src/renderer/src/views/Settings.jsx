import React, { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'

export default function Settings() {
  const [patterns, setPatterns] = useState([])
  const [input, setInput] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.getSettings().then((s) => setPatterns(s.excludePatterns ?? []))
  }, [])

  async function save(newPatterns) {
    await window.api.setSettings({ excludePatterns: newPatterns })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addPattern() {
    const trimmed = input.trim()
    if (!trimmed || patterns.includes(trimmed)) { setInput(''); return }
    const next = [...patterns, trimmed]
    setPatterns(next)
    setInput('')
    save(next)
  }

  function removePattern(p) {
    const next = patterns.filter((x) => x !== p)
    setPatterns(next)
    save(next)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') addPattern()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Settings
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            Configure monitoring preferences
          </p>
        </div>
        {saved && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--status-ok)' }}>Saved</span>
        )}
      </div>

      <div className="card">
        <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
          Exclude patterns
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
          Files and folders matching these patterns are skipped during baseline creation and scanning. Matches on path substrings.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. node_modules or *.log"
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--border-focus)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
          />
          <button className="btn-primary" onClick={addPattern}>
            <Plus size={14} />
            Add
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {patterns.map((p) => (
            <span
              key={p}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-pill)',
                padding: '3px 10px 3px 12px',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
            >
              {p}
              <button
                onClick={() => removePattern(p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {patterns.length === 0 && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No exclusions — all files are scanned</p>
          )}
        </div>
      </div>
    </div>
  )
}
