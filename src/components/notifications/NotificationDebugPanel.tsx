import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useOneSignal } from '@/hooks/useOneSignal'
import { useAuthState } from '@/hooks/useAuthState'
import { supabase } from '@/integrations/supabase/client'
import { Bell, BellOff, RefreshCw, Send, Check, X, AlertCircle, Loader2 } from 'lucide-react'

export function NotificationDebugPanel() {
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
  const [refreshing, setRefreshing] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'pending'>>({})

  useEffect(() => {
    if (isInitialized) {
      fetchStatus()
    }
  }, [isInitialized])

  const fetchStatus = async () => {
    const status = await checkSubscriptionStatus()
    setSubscriptionStatus(status)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStatus()
    setRefreshing(false)
  }

  const runTest = async (testKey: string, testFn: () => Promise<boolean>) => {
    setTestResults(prev => ({ ...prev, [testKey]: 'pending' }))
    try {
      const result = await testFn()
      setTestResults(prev => ({ ...prev, [testKey]: result ? 'success' : 'error' }))
      return result
    } catch (error) {
      console.error(`Test ${testKey} failed:`, error)
      setTestResults(prev => ({ ...prev, [testKey]: 'error' }))
      return false
    }
  }

  const testOneSignalSDK = async (): Promise<boolean> => {
    return typeof window !== 'undefined' && !!window.OneSignal
  }

  const testInitialization = async (): Promise<boolean> => {
    return isInitialized
  }

  const testPermissionRequest = async (): Promise<boolean> => {
    return await requestPermission()
  }

  const testPlayerIdCapture = async (): Promise<boolean> => {
    return !!playerId
  }

  const testSupabaseSync = async (): Promise<boolean> => {
    if (!playerId || !user?.id) return false
    const result = await syncPlayerIdWithServer(playerId)
    return result.success
  }

  const testNotificationSend = async (): Promise<boolean> => {
    if (!user) return false
    
    try {
      const { data, error } = await supabase.functions.invoke('onesignal-notifications', {
        body: {
          action: 'send_notification',
          title: 'Teste de Notificação',
          message: 'Esta é uma notificação de teste do sistema.',
          segment: 'todos',
          teacher_id: user.id
        }
      })

      if (error) throw error
      return !!data.success
    } catch (error) {
      console.error('Test notification failed:', error)
      return false
    }
  }

  const runAllTests = async () => {
    const tests = [
      { key: 'sdk', fn: testOneSignalSDK, name: 'SDK OneSignal' },
      { key: 'init', fn: testInitialization, name: 'Inicialização' },
      { key: 'permission', fn: testPermissionRequest, name: 'Permissão' },
      { key: 'player', fn: testPlayerIdCapture, name: 'Player ID' },
      { key: 'sync', fn: testSupabaseSync, name: 'Sincronização' },
      { key: 'notification', fn: testNotificationSend, name: 'Envio de Teste' }
    ]

    for (const test of tests) {
      await runTest(test.key, test.fn)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <Check className="h-4 w-4 text-green-500" />
      case 'error': return <X className="h-4 w-4 text-red-500" />
      case 'pending': return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge variant="default">Sucesso</Badge>
      case 'error': return <Badge variant="destructive">Erro</Badge>
      case 'pending': return <Badge variant="secondary">Testando...</Badge>
      default: return <Badge variant="outline">Não testado</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Debug de Notificações OneSignal</h3>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <div className="space-y-4">
          {/* Status Geral */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-3 border rounded">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 
                isInitialized ? <Check className="h-5 w-5 text-green-500" /> : 
                <X className="h-5 w-5 text-red-500" />
              }
              <span className="text-xs text-center mt-1">Inicializado</span>
            </div>
            
            <div className="flex flex-col items-center p-3 border rounded">
              {subscriptionStatus ? <Bell className="h-5 w-5 text-green-500" /> : 
                <BellOff className="h-5 w-5 text-red-500" />
              }
              <span className="text-xs text-center mt-1">Permissão</span>
            </div>
            
            <div className="flex flex-col items-center p-3 border rounded">
              {playerId ? <Check className="h-5 w-5 text-green-500" /> : 
                <X className="h-5 w-5 text-red-500" />
              }
              <span className="text-xs text-center mt-1">Player ID</span>
            </div>
            
            <div className="flex flex-col items-center p-3 border rounded">
              {user ? <Check className="h-5 w-5 text-green-500" /> : 
                <X className="h-5 w-5 text-red-500" />
              }
              <span className="text-xs text-center mt-1">Usuário</span>
            </div>
          </div>

          {/* Informações Detalhadas */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Player ID:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {playerId || 'Não definido'}
              </code>
            </div>
            <div className="flex justify-between">
              <span>Usuário ID:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {user?.id || 'Não logado'}
              </code>
            </div>
            <div className="flex justify-between">
              <span>Status de Inscrição:</span>
              <Badge variant={subscriptionStatus ? "default" : "destructive"}>
                {subscriptionStatus ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Testes Automatizados */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Testes do Sistema</h4>
          <Button onClick={runAllTests} size="sm">
            <Send className="h-4 w-4 mr-2" />
            Executar Todos os Testes
          </Button>
        </div>

        <div className="space-y-3">
          {[
            { key: 'sdk', name: 'SDK OneSignal Carregado', desc: 'Verifica se o SDK está disponível' },
            { key: 'init', name: 'Inicialização', desc: 'Verifica se OneSignal foi inicializado' },
            { key: 'permission', name: 'Permissão de Notificação', desc: 'Testa solicitação de permissão' },
            { key: 'player', name: 'Captura de Player ID', desc: 'Verifica se Player ID foi obtido' },
            { key: 'sync', name: 'Sincronização com Supabase', desc: 'Testa sincronização do Player ID' },
            { key: 'notification', name: 'Envio de Notificação', desc: 'Testa envio de notificação completo' }
          ].map((test) => (
            <div key={test.key} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center space-x-3">
                {getStatusIcon(testResults[test.key] || 'none')}
                <div>
                  <p className="font-medium">{test.name}</p>
                  <p className="text-sm text-gray-600">{test.desc}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(testResults[test.key] || 'none')}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runTest(test.key, eval(`test${test.key === 'sdk' ? 'OneSignalSDK' : test.key === 'init' ? 'Initialization' : test.key === 'permission' ? 'PermissionRequest' : test.key === 'player' ? 'PlayerIdCapture' : test.key === 'sync' ? 'SupabaseSync' : 'NotificationSend'}`))}
                  disabled={testResults[test.key] === 'pending'}
                >
                  Testar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Alertas */}
      {!isInitialized && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            OneSignal não foi inicializado. Verifique se o SDK está sendo carregado corretamente.
          </AlertDescription>
        </Alert>
      )}

      {!user && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Usuário não está logado. Faça login para testar as funcionalidades completas.
          </AlertDescription>
        </Alert>
      )}

      {!playerId && isInitialized && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Player ID não foi capturado. Isso pode indicar problemas na permissão de notificações.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}