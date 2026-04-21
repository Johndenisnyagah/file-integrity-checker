import { useState, useEffect } from 'react'

export function useScanner() {
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    window.api.onScanProgress((data) => setProgress(data))
    return () => window.api.offScanProgress()
  }, [])

  async function runScan(folderPath) {
    setScanning(true)
    setProgress(null)
    try {
      return await window.api.runScan(folderPath)
    } finally {
      setScanning(false)
      setProgress(null)
    }
  }

  return { scanning, progress, runScan }
}
