import React from 'react'
import { LayoutDashboard, History, Settings, Shield } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ currentView, onNavigate }) {
  return (
    <nav className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-8)' }}>
        <Shield size={20} color="var(--status-ok)" />
        <span style={{ fontWeight: 600, fontSize: 'var(--text-md)', letterSpacing: '-0.01em' }}>
          Integrity
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1 }}>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            className={`nav-item${currentView === id || (currentView === 'scan-results' && id === 'dashboard') ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={16} />
            {label}
          </div>
        ))}
      </div>
    </nav>
  )
}
