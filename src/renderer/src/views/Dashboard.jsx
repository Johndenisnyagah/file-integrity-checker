import React, { useState, useEffect } from 'react'
import { FolderOpen, Plus, Trash2, ScanLine, RefreshCw, Eye, EyeOff } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import ProgressBar from '../components/ProgressBar'
import { useFolders } from '../hooks/useFolders'

export default function Dashboard({ onNavigate }) {
  const { folders, loading, refresh } = useFolders()
  const [busy, setBusy] = useState(null) // folderPath | 'adding' | null
  const [progress, setProgress] = useState(null)
  const [watching, setWatching] = useState(new Set()) // Set of folderPaths being watched
  const [watchEvents, setWatchEvents] = useState({}) // folderPath -> last event

  useEffect(() => {
    window.api.onWatchEvent((data) => {
      setWatchEvents((prev) => ({ ...prev, [data.folderPath]: data }))
    })
    return () => window.api.offWatchEvent()
  }, [])

  async function handleAddFolder() {
    const folderPath = await window.api.selectFolder()
    if (!folderPath) return

    setBusy('adding')
    setProgress(null)
    window.api.onScanProgress((data) => setProgress(data))

    try {
      await window.api.createBaseline(folderPath)
      await refresh()
    } finally {
      window.api.offScanProgress()
      setBusy(null)
      setProgress(null)
    }
  }

  async function handleScan(folder) {
    setBusy(folder.path)
    setProgress(null)
    window.api.onScanProgress((data) => setProgress(data))

    try {
      const result = await window.api.runScan(folder.path)
      if (result.error) return
      onNavigate('scan-results', { scanId: result.scanId })
    } finally {
      window.api.offScanProgress()
      setBusy(null)
      setProgress(null)
    }
  }

  async function handleRebaseline(folder) {
    setBusy(folder.path)
    setProgress(null)
    window.api.onScanProgress((data) => setProgress(data))

    try {
      await window.api.createBaseline(folder.path)
      await refresh()
    } finally {
      window.api.offScanProgress()
      setBusy(null)
      setProgress(null)
    }
  }

  async function handleToggleWatch(folder) {
    if (watching.has(folder.path)) {
      await window.api.stopWatch(folder.path)
      setWatching((prev) => { const s = new Set(prev); s.delete(folder.path); return s })
    } else {
      await window.api.startWatch(folder.path)
      setWatching((prev) => new Set([...prev, folder.path]))
    }
  }

  async function handleRemove(id, folderPath) {
    if (watching.has(folderPath)) {
      await window.api.stopWatch(folderPath)
      setWatching((prev) => { const s = new Set(prev); s.delete(folderPath); return s })
    }
    await window.api.removeFolder(id)
    await refresh()
  }

  const isAdding = busy === 'adding'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            Monitor your folders for file changes
          </p>
        </div>
        <button className="btn-primary" onClick={handleAddFolder} disabled={!!busy}>
          <Plus size={14} />
          Add Folder
        </button>
      </div>

      {busy && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ProgressBar
            current={progress?.current ?? 0}
            total={progress?.total ?? 0}
            file={progress?.file ?? ''}
          />
        </div>
      )}

      {!loading && folders.length === 0 && !busy ? (
        <EmptyState
          icon={<FolderOpen size={48} />}
          title="No folders monitored"
          description="Add a folder to start monitoring file integrity"
          action={
            <button className="btn-primary" onClick={handleAddFolder}>
              <FolderOpen size={14} />
              Add Folder
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              scanning={busy === folder.path}
              disabled={!!busy}
              isWatching={watching.has(folder.path)}
              lastWatchEvent={watchEvents[folder.path]}
              onScan={() => handleScan(folder)}
              onRebaseline={() => handleRebaseline(folder)}
              onRemove={() => handleRemove(folder.id, folder.path)}
              onToggleWatch={() => handleToggleWatch(folder)}
              onNavigate={onNavigate}
              onScheduleChange={async (interval) => {
                await window.api.setSchedule({ folderId: folder.id, interval })
                await refresh()
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FolderCard({ folder, scanning, disabled, isWatching, lastWatchEvent, onScan, onRebaseline, onRemove, onToggleWatch, onNavigate, onScheduleChange }) {
  const baselineDate = folder.baseline_at
    ? new Date(folder.baseline_at + 'Z').toLocaleString()
    : 'No baseline'
  const schedule = folder.schedule_interval ?? 'manual'

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {folder.path}
            </p>
            {isWatching && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--status-ok)', flexShrink: 0 }}>● Live</span>
            )}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
            {folder.file_count ?? 0} files &middot; Baseline: {baselineDate}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0, alignItems: 'center' }}>
          <select
            value={schedule}
            onChange={(e) => onScheduleChange(e.target.value)}
            disabled={disabled}
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 10px',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <option value="manual">Manual</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <button className="btn-primary" onClick={onScan} disabled={disabled}>
            <ScanLine size={14} />
            {scanning ? 'Scanning…' : 'Scan'}
          </button>
          <button
            className="btn-ghost"
            onClick={onToggleWatch}
            disabled={disabled}
            title={isWatching ? 'Stop watching' : 'Start live watch'}
            style={isWatching ? { color: 'var(--status-ok)', borderColor: 'rgba(62,207,142,0.3)' } : {}}
          >
            {isWatching ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button className="btn-ghost" onClick={onRebaseline} disabled={disabled} title="Update baseline">
            <RefreshCw size={14} />
          </button>
          <button className="btn-ghost" onClick={() => onNavigate('history', { folderId: folder.id, folderPath: folder.path })} disabled={disabled}>
            History
          </button>
          <button
            className="btn-ghost"
            style={{ color: 'var(--status-deleted)', borderColor: 'rgba(239,68,68,0.2)' }}
            onClick={onRemove}
            disabled={disabled}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {isWatching && lastWatchEvent && (
        <p style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lastWatchEvent.event}: {lastWatchEvent.path}
        </p>
      )}
    </div>
  )
}
