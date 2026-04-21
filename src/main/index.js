import { app, BrowserWindow, Tray, Menu, Notification, session } from 'electron'
import path from 'path'
import { getDb, closeDb } from './db.js'
import { registerHandlers } from './handlers.js'
import { clearAll as clearAllSchedules } from './scheduler.js'
import { stopAll as stopAllWatchers } from './watcher.js'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

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
      // sandbox: true is the Electron default — do not disable it (Finding #1)
    }
  })

  // Block DevTools in production builds (Finding #18)
  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
        event.preventDefault()
      }
    })
    mainWindow.removeMenu()
  }

  mainWindow.on('close', () => {
    app.quit()
  })

  if (isDev) {
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
  // Deny all permission requests — app needs none (Finding #17)
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })

  // Block navigation away from the local page (defence-in-depth)
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    // Allow local vite dev server and file:// only
    if (details.url.startsWith('http://localhost') || details.url.startsWith('file://')) {
      callback({})
    } else {
      callback({ cancel: true })
    }
  })

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
  stopAllWatchers()   // Finding #10 — stop all chokidar watchers on quit
  closeDb()
  if (mainWindow) {
    mainWindow.removeAllListeners('close')
  }
})

app.on('window-all-closed', () => {
  app.quit()
})
