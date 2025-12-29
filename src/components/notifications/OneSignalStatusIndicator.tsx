import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useOneSignal } from '@/hooks/useOneSignal'

export function OneSignalStatusIndicator() {
  const { isInitialized, playerId, loading, platform, isNative } = useOneSignal()

  if (loading) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Inicializando...
      </Badge>
    )
  }

  if (isInitialized && playerId) {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <Bell className="h-3 w-3" />
        {isNative ? `Push ${platform}` : 'Web Push'}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <BellOff className="h-3 w-3" />
      Push Inativo
    </Badge>
  )
}