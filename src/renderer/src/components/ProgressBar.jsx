import React from 'react'

export default function ProgressBar({ current, total, file }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="scan-progress">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          Scanning files…
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {current} / {total}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {file && (
        <div className="progress-file">{file}</div>
      )}
    </div>
  )
}
