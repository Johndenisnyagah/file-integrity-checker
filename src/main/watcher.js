import chokidar from 'chokidar'

const watchers = new Map()

export function startWatch(folderPath, onEvent) {
  if (watchers.has(folderPath)) return
  const watcher = chokidar.watch(folderPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  })
  watcher.on('change', (p) => onEvent({ path: p, event: 'change' }))
  watcher.on('add', (p) => onEvent({ path: p, event: 'add' }))
  watcher.on('unlink', (p) => onEvent({ path: p, event: 'unlink' }))
  watchers.set(folderPath, watcher)
}

export function stopWatch(folderPath) {
  watchers.get(folderPath)?.close()
  watchers.delete(folderPath)
}

export function stopAll() {
  watchers.forEach((w) => w.close())
  watchers.clear()
}
