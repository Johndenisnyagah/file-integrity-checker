import React from 'react'

const STATUS_LABELS = {
  OK: 'OK',
  MODIFIED: 'Modified',
  ADDED: 'Added',
  DELETED: 'Deleted',
}

export default function StatusBadge({ status }) {
  const cls = status ? `badge badge-${status.toLowerCase()}` : 'badge'
  return <span className={cls}>{STATUS_LABELS[status] ?? status}</span>
}
