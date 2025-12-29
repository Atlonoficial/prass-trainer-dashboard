import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Settings,
  Bell
} from 'lucide-react'
import { useOneSignal } from '@/hooks/useOneSignal'
import { useAuthState } from '@/hooks/useAuthState'
import { supabase } from '@/integrations/supabase/client'

export function OneSignalDebugPanel() {
  const { 
    isInitialized, 
    playerId, 
    loading,
    requestPermission,
    syncPlayerIdWithServer,
    checkSubscriptionStatus 
  } = useOneSignal()
  
  const { user } = useAuthState()
  
  const [subscriptionStatus, setSubscriptionStatus] = useState<boolean | null>(null)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [serverSyncStatus, setServerSyncStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isInitialized) {
      fetchStatus()
    }
  }, [isInitialized])

  useEffect(() => {
    setCurrentPlayerId(playerId)
  }, [playerId])

  const fetchStatus = async () => {
    try {
      const status = await checkSubscriptionStatus()
      setSubscriptionStatus(status)
      
      if (window.OneSignal && isInitialized) {
        const id = window.OneSignal.User.PushSubscription.id
        setCurrentPlayerId(id)
        console.log('Debug Panel: Player ID atual:', id)
      }
    } catch (error) {
      console.error('Error fetching status:', error)
    }
  }

  const handleRequestPermission = async () => {
    const granted = await requestPermission()
    if (granted) {
      await fetchStatus()
    }
  }

  const handleSyncPlayerId = async () => {
    if (currentPlayerId) {
      setServerSyncStatus('pending')
      const success = await syncPlayerIdWithServer(currentPlayerId)
      setServerSyncStatus(success ? 'success' : 'error')
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStatus()
    setRefreshing(false)
  }

  const testNotification = async () => {
    if (!user?.id) {
      console.error('User not authenticated')
      return
    }

    try {
      console.log('Sending OneSignal test notification...')
      const { data, error } = await supabase.functions.invoke('onesignal-notifications', {
        body: {
          action: 'send_notification',
          title: 'Teste OneSignal',
          message: 'Esta é uma notificação de teste do sistema OneSignal!',
          segment: 'todos',
          teacher_id: user.id
        }
      })

      if (error) throw error

      console.log('Test notification result:', data)
    } catch (error: any) {
      console.error('Test notification error:', error)
    }
  }

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <AlertCircle className="h-4 w-4 text-yellow-500" />
    return status ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusText = (status: boolean | null) => {
    if (status === null) return 'Verificando...'
    return status ? 'Ativo' : 'Inativo'
  }

  const getSyncStatusIcon = () => {
    switch (serverSyncStatus) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          OneSignal Debug Panel
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(isInitialized)}
              <span className="text-sm font-medium">SDK Inicializado</span>
            </div>
            <Badge variant={isInitialized ? "default" : "secondary"}>
              {isInitialized ? 'Sim' : 'Não'}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : getStatusIcon(!loading)}
              <span className="text-sm font-medium">Status de Loading</span>
            </div>
            <Badge variant={loading ? "secondary" : "default"}>
              {loading ? 'Carregando' : 'Pronto'}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(subscriptionStatus)}
              <span className="text-sm font-medium">Notificações Ativas</span>
            </div>
            <Badge variant={subscriptionStatus ? "default" : "secondary"}>
              {getStatusText(subscriptionStatus)}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {currentPlayerId ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
              <span className="text-sm font-medium">Player ID</span>
            </div>
            <Badge variant={currentPlayerId ? "default" : "secondary"}>
              {currentPlayerId ? 'Capturado' : 'Não Capturado'}
            </Badge>
          </div>
        </div>

        {/* Player ID Info */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Player ID Atual:</label>
          <div className="bg-muted p-2 rounded text-xs font-mono break-all">
            {currentPlayerId || 'Não capturado ainda'}
          </div>
          {!currentPlayerId && (
            <p className="text-xs text-muted-foreground">
              Player ID será gerado após conceder permissão para notificações
            </p>
          )}
        </div>

        {/* OneSignal Configuration Debug */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Configuração OneSignal:</label>
          <div className="bg-muted p-2 rounded text-xs space-y-1">
            <div>App ID: 37462be7-05a8-4fe2-8359-c3647a62ca18</div>
            <div>SDK Loaded: {typeof window !== 'undefined' && window.OneSignal ? 'Sim' : 'Não'}</div>
            <div>Service Worker: {typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? 'Suportado' : 'Não suportado'}</div>
          </div>
        </div>

        {/* User Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {user ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
            <span className="text-sm font-medium">Usuário Logado</span>
          </div>
          <Badge variant={user ? "default" : "secondary"}>
            {user ? `${user.email}` : 'Não logado'}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {!subscriptionStatus && (
            <Button onClick={handleRequestPermission} size="sm">
              Solicitar Permissão
            </Button>
          )}
          
          {currentPlayerId && user && (
            <Button 
              onClick={handleSyncPlayerId} 
              size="sm" 
              variant="outline"
              className="flex items-center gap-2"
            >
              {getSyncStatusIcon()}
              Sincronizar Player ID
            </Button>
          )}

          {user && isInitialized && (
            <Button 
              onClick={testNotification} 
              size="sm" 
              variant="outline"
            >
              Testar Notificação
            </Button>
          )}
        </div>

        {/* Overall Status */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2">
            {isInitialized && currentPlayerId && subscriptionStatus && user ? 
              <CheckCircle className="h-5 w-5 text-green-500" /> : 
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            }
            <span className="font-medium">
              {isInitialized && currentPlayerId && subscriptionStatus && user ? 
                'Sistema Funcionando Corretamente' : 
                'Configuração Incompleta'
              }
            </span>
          </div>
          
          {(!isInitialized || !currentPlayerId || !subscriptionStatus || !user) && (
            <div className="mt-2 text-sm text-muted-foreground">
              <p>Para o sistema funcionar completamente:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {!user && <li>Faça login no sistema</li>}
                {!isInitialized && <li>SDK OneSignal deve ser inicializado</li>}
                {!subscriptionStatus && <li>Permissão para notificações deve ser concedida</li>}
                {!currentPlayerId && <li>Player ID deve ser capturado</li>}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}