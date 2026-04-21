import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './views/Dashboard'
import History from './views/History'
import Settings from './views/Settings'
import ScanResults from './views/ScanResults'
import './styles/globals.css'

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [navParams, setNavParams] = useState({})

  function navigate(view, params = {}) {
    setNavParams(params)
    setCurrentView(view)
  }

  return (
    <div className="app-shell">
      <Sidebar currentView={currentView} onNavigate={navigate} />
      <main className="main-content">
        {currentView === 'dashboard' && <Dashboard onNavigate={navigate} />}
        {currentView === 'history' && <History onNavigate={navigate} folderId={navParams.folderId} folderPath={navParams.folderPath} />}
        {currentView === 'settings' && <Settings />}
        {currentView === 'scan-results' && <ScanResults scanId={navParams.scanId} onNavigate={navigate} />}
      </main>
    </div>
  )
}
