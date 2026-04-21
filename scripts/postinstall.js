const { execSync } = require('child_process')
const path = require('path')

// Download Electron binary
try {
  require('./node_modules/electron/install.js')
} catch (_) {}

// Build better-sqlite3 from source for Electron 41 (no prebuilt available yet)
const rebuildCli = path.join(__dirname, '../node_modules/@electron/rebuild/lib/cli.js')
try {
  execSync(
    `node "${rebuildCli}" -v 41.2.1 -m "${path.join(__dirname, '../node_modules/better-sqlite3')}"`,
    { cwd: path.join(__dirname, '..'), stdio: 'inherit' }
  )
} catch (_) {
  console.warn('better-sqlite3 rebuild failed — see CONTRIBUTING.md for prerequisites')
}
