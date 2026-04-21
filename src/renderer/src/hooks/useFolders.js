import { useState, useEffect, useCallback } from 'react'

export function useFolders() {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.getFolders()
      setFolders(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { folders, loading, refresh }
}
