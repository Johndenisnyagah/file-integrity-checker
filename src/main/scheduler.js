import cron from 'node-cron'

const jobs = new Map()

export function setSchedule(folderId, cronString, callback) {
  clearSchedule(folderId)
  const task = cron.schedule(cronString, callback)
  jobs.set(folderId, task)
}

export function clearSchedule(folderId) {
  if (jobs.has(folderId)) {
    jobs.get(folderId).stop()
    jobs.delete(folderId)
  }
}

export function clearAll() {
  jobs.forEach((j) => j.stop())
  jobs.clear()
}
