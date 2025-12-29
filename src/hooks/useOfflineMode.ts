import { useState, useEffect } from 'react'

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineMode] Connection restored')
      setIsOnline(true)
      
      if (wasOffline) {
        // Trigger data sync after coming back online
        window.dispatchEvent(new CustomEvent('app:reconnected'))
        setWasOffline(false)
      }
    }

    const handleOffline = () => {
      console.warn('[OfflineMode] Connection lost')
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline
  }
}
