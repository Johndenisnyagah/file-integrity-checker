import React from 'react'

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-10)',
      gap: 'var(--space-4)',
      color: 'var(--text-muted)',
    }}>
      {icon && <div style={{ opacity: 0.4 }}>{icon}</div>}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {description}
          </div>
        )}
      </div>
      {action}
    </div>
  )
}
