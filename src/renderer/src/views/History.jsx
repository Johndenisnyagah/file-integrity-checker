import React, { useState, useEffect } from 'react'
import { History as HistoryIcon, ArrowLeft } from 'lucide-react'
import EmptyState from '../components/EmptyState'

export default function History({ onNavigate, folderId, folderPath }) {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!folderId) { setLoading(false); return }
    window.api.getHistory(folderId).then((data) => {
      setScans(data)
      setLoading(false)
    })
  }, [folderId])

  if (!folderId) {
    return (
      <div>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 'var(--space-8)' }}>
          History
        </h1>
        <EmptyState
          icon={<HistoryIcon size={48} />}
          title="No folder selected"
          description="Click History on a folder card to view its scan history"
        />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <button className="btn-ghost" onClick={() => onNavigate('dashboard')} style={{ padding: 'var(--space-2)' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em' }}>
            History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folderPath}
          </p>
        </div>
      </div>

      {!loading && scans.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={48} />}
          title="No scan history"
          description="Run a scan from the Dashboard to start building history"
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="results-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Triggered by</th>
                <th>Files</th>
                <th>Changes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(scan.scanned_at + 'Z').toLocaleString()}
                  </td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                    {scan.triggered_by}
                  </td>
                  <td>{scan.total_files}</td>
                  <td style={{ color: scan.changes_found > 0 ? 'var(--status-modified)' : 'var(--status-ok)' }}>
                    {scan.changes_found}
                  </td>
                  <td>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 'var(--text-xs)', padding: '4px 12px' }}
                      onClick={() => onNavigate('scan-results', { scanId: scan.id })}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
