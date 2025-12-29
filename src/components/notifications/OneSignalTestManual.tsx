import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play,
  RefreshCw,
  Bell,
  Settings
} from 'lucide-react'

export function OneSignalTestManual() {
  const [testStep, setTestStep] = useState(0)
  const [testResults, setTestResults] = useState<{ [key: number]: 'success' | 'error' | 'pending' }>({})

  const testSteps = [
    {
      title: "1. Verificar SDK Carregado",
      description: "Verificar se o OneSignal SDK foi carregado corretamente",
      action: () => checkSDKLoaded(),
      expected: "window.OneSignal deve estar disponível"
    },
    {
      title: "2. Inicialização do OneSignal",
      description: "Verificar se o OneSignal foi inicializado",
      action: () => checkInitialization(),
      expected: "OneSignal deve estar inicializado sem erros"
    },
    {
      title: "3. Solicitar Permissão",
      description: "Solicitar permissão para notificações",
      action: () => requestNotificationPermission(),
      expected: "Usuário deve conceder permissão para notificações"
    },
    {
      title: "4. Capturar Player ID",
      description: "Verificar se o Player ID foi capturado",
      action: () => checkPlayerIdCapture(),
      expected: "Player ID deve ser uma string válida"
    },
    {
      title: "5. Sincronizar com Supabase",
      description: "Sincronizar Player ID com o banco de dados",
      action: () => syncWithSupabase(),
      expected: "Player ID deve ser salvo na tabela profiles"
    },
    {
      title: "6. Enviar Notificação de Teste",
      description: "Enviar uma notificação de teste",
      action: () => sendTestNotification(),
      expected: "Notificação deve aparecer no dispositivo"
    }
  ]

  const checkSDKLoaded = async () => {
    try {
      if (typeof window !== 'undefined' && window.OneSignal) {
        setTestResults(prev => ({ ...prev, 0: 'success' }))
        console.log('✅ OneSignal SDK carregado com sucesso')
        return true
      } else {
        setTestResults(prev => ({ ...prev, 0: 'error' }))
        console.error('❌ OneSignal SDK não encontrado')
        return false
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, 0: 'error' }))
      console.error('❌ Erro ao verificar SDK:', error)
      return false
    }
  }

  const checkInitialization = async () => {
    try {
      if (window.OneSignal && window.OneSignal.initialized) {
        setTestResults(prev => ({ ...prev, 1: 'success' }))
        console.log('✅ OneSignal inicializado com sucesso')
        return true
      } else {
        setTestResults(prev => ({ ...prev, 1: 'error' }))
        console.error('❌ OneSignal não inicializado')
        return false
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, 1: 'error' }))
      console.error('❌ Erro ao verificar inicialização:', error)
      return false
    }
  }

  const requestNotificationPermission = async () => {
    try {
      const permission = await window.OneSignal.Notifications.requestPermission()
      if (permission) {
        setTestResults(prev => ({ ...prev, 2: 'success' }))
        console.log('✅ Permissão concedida')
        return true
      } else {
        setTestResults(prev => ({ ...prev, 2: 'error' }))
        console.error('❌ Permissão negada pelo usuário')
        return false
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, 2: 'error' }))
      console.error('❌ Erro ao solicitar permissão:', error)
      return false
    }
  }

  const checkPlayerIdCapture = async () => {
    try {
      const playerId = window.OneSignal.User.PushSubscription.id
      if (playerId) {
        setTestResults(prev => ({ ...prev, 3: 'success' }))
        console.log('✅ Player ID capturado:', playerId)
        return true
      } else {
        setTestResults(prev => ({ ...prev, 3: 'error' }))
        console.error('❌ Player ID não capturado')
        return false
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, 3: 'error' }))
      console.error('❌ Erro ao capturar Player ID:', error)
      return false
    }
  }

  const syncWithSupabase = async () => {
    // Esta função seria implementada usando o hook useOneSignal
    console.log('🔄 Implementar sincronização com Supabase via hook useOneSignal')
    setTestResults(prev => ({ ...prev, 4: 'pending' }))
    return true
  }

  const sendTestNotification = async () => {
    // Esta função seria implementada usando a edge function
    console.log('🔄 Implementar envio de notificação de teste')
    setTestResults(prev => ({ ...prev, 5: 'pending' }))
    return true
  }

  const runTest = async (stepIndex: number) => {
    setTestResults(prev => ({ ...prev, [stepIndex]: 'pending' }))
    
    try {
      const success = await testSteps[stepIndex].action()
      if (success && stepIndex < testSteps.length - 1) {
        setTestStep(stepIndex + 1)
      }
    } catch (error) {
      console.error(`Erro no teste ${stepIndex + 1}:`, error)
      setTestResults(prev => ({ ...prev, [stepIndex]: 'error' }))
    }
  }

  const runAllTests = async () => {
    for (let i = 0; i < testSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Delay entre testes
      await runTest(i)
    }
  }

  const getStatusIcon = (status: 'success' | 'error' | 'pending' | undefined) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: 'success' | 'error' | 'pending' | undefined) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Sucesso</Badge>
      case 'error':
        return <Badge variant="destructive">Erro</Badge>
      case 'pending':
        return <Badge variant="secondary">Executando...</Badge>
      default:
        return <Badge variant="outline">Aguardando</Badge>
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Manual de Teste OneSignal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Este manual irá testar todos os componentes do sistema de notificações OneSignal.
            Siga os passos em ordem para validar o funcionamento.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2 mb-4">
          <Button onClick={runAllTests} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Executar Todos os Testes
          </Button>
        </div>

        <div className="space-y-3">
          {testSteps.map((step, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(testResults[index])}
                <div>
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  <p className="text-xs text-blue-600 mt-1">Esperado: {step.expected}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(testResults[index])}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runTest(index)}
                  disabled={testResults[index] === 'pending'}
                >
                  Testar
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Resultados Finais */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Resumo dos Testes</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-green-600 font-medium">
                Sucessos: {Object.values(testResults).filter(r => r === 'success').length}
              </span>
            </div>
            <div>
              <span className="text-red-600 font-medium">
                Erros: {Object.values(testResults).filter(r => r === 'error').length}
              </span>
            </div>
            <div>
              <span className="text-yellow-600 font-medium">
                Pendentes: {Object.values(testResults).filter(r => r === 'pending').length}
              </span>
            </div>
          </div>
        </div>

        {/* Instruções Adicionais */}
        <Alert>
          <AlertDescription>
            <strong>Dicas importantes:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Execute os testes em ordem sequencial</li>
              <li>• Certifique-se de que está em HTTPS (necessário para notificações)</li>
              <li>• Verifique o console do navegador para logs detalhados</li>
              <li>• Player ID só é gerado após conceder permissão</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}