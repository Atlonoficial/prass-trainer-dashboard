import { useOfflineMode } from '@/hooks/useOfflineMode'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WifiOff, Wifi } from 'lucide-react'

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOfflineMode()

  if (isOnline && !wasOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <Alert variant={isOnline ? 'default' : 'destructive'} className="shadow-lg">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <AlertDescription>
                Conexão restaurada! Sincronizando dados...
              </AlertDescription>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                Você está offline. Algumas funcionalidades podem estar limitadas.
              </AlertDescription>
            </>
          )}
        </div>
      </Alert>
    </div>
  )
}
