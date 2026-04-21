import React from 'react'
import { LayoutDashboard, History, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'history',   label: 'History',   icon: History },
  { id: 'settings',  label: 'Settings',  icon: Settings },
]

/** Dark glossy folder icon — matches the reference image */
function FolderLogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Folder body gradient — dark charcoal */}
        <linearGradient id="bodyGrad" x1="17" y1="5" x2="17" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#2c2c2c"/>
          <stop offset="100%" stopColor="#141414"/>
        </linearGradient>
        {/* Front flap glass gradient */}
        <linearGradient id="flapGrad" x1="17" y1="15" x2="17" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#303030" stopOpacity="0.95"/>
          <stop offset="60%"  stopColor="#1c1c1c" stopOpacity="0.98"/>
          <stop offset="100%" stopColor="#0e0e0e" stopOpacity="1"/>
        </linearGradient>
        {/* Glass sheen */}
        <linearGradient id="sheenGrad" x1="17" y1="15" x2="17" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="white" stopOpacity="0.07"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* ── Folder body ── */}
      <path
        d="M4 10.5C4 8.567 5.567 7 7.5 7H14L16 9.5H27.5C29.433 9.5 31 11.067 31 13V28C31 29.933 29.433 31.5 27.5 31.5H7.5C5.567 31.5 4 29.933 4 28V10.5Z"
        fill="url(#bodyGrad)"
      />

      {/* ── Document page 2 (back — slightly tilted) ── */}
      <g transform="rotate(-6 17 14)" style={{ transformOrigin: '17px 14px' }}>
        <rect x="11.5" y="6.5" width="13" height="13" rx="2" fill="#d0d0d0" opacity="0.75"/>
        <rect x="13.5" y="9.5" width="6"  height="1"  rx="0.5" fill="rgba(0,0,0,0.18)"/>
        <rect x="13.5" y="11.5" width="4" height="1"  rx="0.5" fill="rgba(0,0,0,0.14)"/>
      </g>

      {/* ── Document page 1 (front) ── */}
      <rect x="12" y="7" width="13" height="13" rx="2" fill="#e8e8e8" opacity="0.92"/>
      <rect x="14" y="10" width="7"  height="1.2" rx="0.6" fill="rgba(0,0,0,0.18)"/>
      <rect x="14" y="12.5" width="5" height="1.2" rx="0.6" fill="rgba(0,0,0,0.14)"/>
      <rect x="14" y="15"  width="6" height="1.2" rx="0.6" fill="rgba(0,0,0,0.1)"/>

      {/* ── Front flap (glass panel) ── */}
      <path
        d="M4 15H31V28C31 29.933 29.433 31.5 27.5 31.5H7.5C5.567 31.5 4 29.933 4 28V15Z"
        fill="url(#flapGrad)"
      />

      {/* ── Glass sheen highlight ── */}
      <path
        d="M4 15H31V22H4V15Z"
        fill="url(#sheenGrad)"
      />

      {/* ── Subtle outer border ── */}
      <path
        d="M4 10.5C4 8.567 5.567 7 7.5 7H14L16 9.5H27.5C29.433 9.5 31 11.067 31 13V28C31 29.933 29.433 31.5 27.5 31.5H7.5C5.567 31.5 4 29.933 4 28V10.5Z"
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="0.75"
      />

      {/* ── Bottom edge catch-light ── */}
      <path
        d="M7 31H28"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Sidebar({ currentView, onNavigate }) {
  return (
    <nav className="sidebar">

      {/* ── Brand ── */}
      <div className="sidebar-brand">
        <FolderLogo />
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">FileGuard</span>
        </div>
      </div>

      {/* ── Nav ── */}
      <p className="sidebar-section-label">MENU</p>

      <div className="sidebar-nav">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive =
            currentView === id ||
            (currentView === 'scan-results' && id === 'dashboard')
          return (
            <div
              key={id}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => onNavigate(id)}
            >
              <span className="nav-icon">
                <Icon size={16} />
              </span>
              <span className="nav-label">{label}</span>
            </div>
          )
        })}
      </div>

    </nav>
  )
}
