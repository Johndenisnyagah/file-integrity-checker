import React, { useState, useEffect } from 'react'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'

export default function ScanResults({ scanId, onNavigate }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    if (!scanId) { setLoading(false); return }
    window.api.getScanResults(scanId).then((data) => {
      setResults(data)
      setLoading(false)
    })
  }, [scanId])

  if (!scanId) {
    return (
      <div>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 'var(--space-8)' }}>
          Scan Results
        </h1>
        <EmptyState
          icon={<CheckCircle size={48} color="var(--status-ok)" />}
          title="No results"
          description="Run a scan from the Dashboard to see results here"
        />
      </div>
    )
  }

  const counts = { ALL: results.length, MODIFIED: 0, ADDED: 0, DELETED: 0, OK: 0 }
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1

  const changes = results.filter((r) => r.status !== 'OK')
  const visible = filter === 'ALL'
    ? results
    : results.filter((r) => r.status === filter)

  const tabs = ['ALL', 'MODIFIED', 'ADDED', 'DELETED', 'OK']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <button className="btn-ghost" onClick={() => onNavigate('dashboard')} style={{ padding: 'var(--space-2)' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Scan Results
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            {changes.length === 0
              ? 'No changes detected — all files match baseline'
              : `${changes.length} change${changes.length !== 1 ? 's' : ''} detected`}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className="btn-ghost"
            style={{
              fontSize: 'var(--text-xs)',
              padding: '4px 12px',
              borderColor: filter === t ? 'var(--border-focus)' : undefined,
              color: filter === t ? 'var(--text-primary)' : undefined,
            }}
          >
            {t} {counts[t] ?? 0}
          </button>
        ))}
      </div>

      {loading ? null : visible.length === 0 ? (
        <EmptyState icon={<CheckCircle size={48} color="var(--status-ok)" />} title="Nothing to show" description="No results match this filter" />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="results-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td style={{ width: 110 }}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="file-path">{r.file_path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
