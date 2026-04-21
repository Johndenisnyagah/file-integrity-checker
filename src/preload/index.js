const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  createBaseline: (p) => ipcRenderer.invoke('create-baseline', p),
  runScan: (p) => ipcRenderer.invoke('run-scan', p),
  getFolders: () => ipcRenderer.invoke('get-folders'),
  getScanResults: (id) => ipcRenderer.invoke('get-scan-results', id),
  getHistory: (id) => ipcRenderer.invoke('get-history', id),
  setSchedule: (d) => ipcRenderer.invoke('set-schedule', d),
  clearSchedule: (id) => ipcRenderer.invoke('clear-schedule', id),
  startWatch: (p) => ipcRenderer.invoke('start-watch', p),
  stopWatch: (p) => ipcRenderer.invoke('stop-watch', p),
  removeFolder: (id) => ipcRenderer.invoke('remove-folder', id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (s) => ipcRenderer.invoke('set-settings', s),
  onScanProgress: (cb) => ipcRenderer.on('scan-progress', (_e, d) => cb(d)),
  onWatchEvent: (cb) => ipcRenderer.on('watch-event', (_e, d) => cb(d)),
  offScanProgress: () => ipcRenderer.removeAllListeners('scan-progress'),
  offWatchEvent: () => ipcRenderer.removeAllListeners('watch-event'),
})
