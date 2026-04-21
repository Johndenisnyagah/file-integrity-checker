const { execSync } = require('child_process')
const path = require('path')

// Download Electron binary
try {
  require('./node_modules/electron/install.js')
} catch (_) {}

// Download prebuilt better-sqlite3 for Electron 31
const prebuildInstall = path.join(__dirname, '../node_modules/prebuild-install/bin.js')
try {
  execSync(
    `node "${prebuildInstall}" --runtime electron --target 31.7.7 --arch x64 --platform win32 --tag-prefix v`,
    { cwd: path.join(__dirname, '../node_modules/better-sqlite3'), stdio: 'inherit' }
  )
} catch (_) {
  console.warn('Prebuilt binary not found — run electron-rebuild manually')
}
