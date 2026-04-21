import { app, BrowserWindow, Tray, Menu, Notification } from 'electron'
import path from 'path'
import { getDb, closeDb } from './db.js'
import { registerHandlers } from './handlers.js'
import { clearAll as clearAllSchedules } from './scheduler.js'

let mainWindow
let tray

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow.hide()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/icon.ico')
  tray = new Tray(iconPath)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit() } }
  ])
  tray.setToolTip('File Integrity Checker')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => mainWindow.show())
}

export function notifyChanges(folderPath, changeCount) {
  new Notification({
    title: 'File Integrity Alert',
    body: `${changeCount} change${changeCount > 1 ? 's' : ''} detected in ${folderPath}`,
    icon: path.join(__dirname, '../../assets/icon.png')
  }).show()
}

app.whenReady().then(() => {
  getDb()
  const win = createWindow()
  registerHandlers(win, notifyChanges)

  try {
    createTray()
  } catch {
    // icon not yet present in dev — tray is optional
  }
})

app.on('before-quit', () => {
  clearAllSchedules()
  closeDb()
  if (mainWindow) {
    mainWindow.removeAllListeners('close')
  }
})

app.on('window-all-closed', () => {
  // stay alive in tray
})
