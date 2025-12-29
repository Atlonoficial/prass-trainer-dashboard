import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface PaymentSystemStatus {
  database_health: 'healthy' | 'warning' | 'error'
  edge_function_health: 'healthy' | 'warning' | 'error'
  recent_transactions: number
  failed_transactions: number
  success_rate: number
  last_successful_payment: string | null
}

export function PaymentSystemMonitor() {
  const [status, setStatus] = useState<PaymentSystemStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkSystemHealth = async () => {
    try {
      setLoading(true)
      
      // Test database connection
      const { data: dbTest, error: dbError } = await supabase
        .from('payment_transactions')
        .select('count')
        .limit(1)

      // Test recent transactions (last 24h)
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      
      const { data: recentTransactions, error: recentError } = await supabase
        .from('payment_transactions')
        .select('status, created_at')
        .gte('created_at', oneDayAgo.toISOString())

      // Calculate metrics
      const recent = recentTransactions?.length || 0
      const failed = recentTransactions?.filter(t => t.status === 'failed').length || 0
      const success_rate = recent > 0 ? ((recent - failed) / recent) * 100 : 100

      // Get last successful payment
      const { data: lastSuccess } = await supabase
        .from('payment_transactions')
        .select('paid_at')
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(1)
        .single()

      // Test edge function (lightweight test)
      let edgeFunctionHealth: 'healthy' | 'warning' | 'error' = 'healthy'
      try {
        // This will test the function without actually creating a payment
        const testResponse = await fetch('/api/test-checkout', { method: 'HEAD' })
        edgeFunctionHealth = testResponse.ok ? 'healthy' : 'warning'
      } catch {
        edgeFunctionHealth = 'error'
      }

      const systemStatus: PaymentSystemStatus = {
        database_health: dbError ? 'error' : 'healthy',
        edge_function_health: edgeFunctionHealth,
        recent_transactions: recent,
        failed_transactions: failed,
        success_rate,
        last_successful_payment: lastSuccess?.paid_at || null
      }

      setStatus(systemStatus)
      setLastCheck(new Date())
      
      if (systemStatus.database_health === 'error' || systemStatus.edge_function_health === 'error') {
        toast.error('Sistema de pagamentos com problemas detectados!')
      } else if (systemStatus.success_rate < 90) {
        toast.warning('Taxa de sucesso dos pagamentos abaixo do esperado')
      }

    } catch (error) {
      console.error('Erro ao verificar saúde do sistema:', error)
      toast.error('Erro ao verificar status do sistema de pagamentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSystemHealth()
  }, [])

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-success'
      case 'warning': return 'text-warning'
      case 'error': return 'text-destructive'
      default: return 'text-muted-foreground'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertCircle className="h-4 w-4" />
      case 'error': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca'
    return new Date(dateStr).toLocaleString('pt-BR')
  }

  if (!status && !loading) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Monitor do sistema não inicializado</p>
          <Button onClick={checkSystemHealth}>
            Verificar Sistema
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Monitor do Sistema de Pagamentos</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={checkSystemHealth}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Banco de Dados</p>
            <div className={`flex items-center gap-2 ${getHealthColor(status.database_health)}`}>
              {getHealthIcon(status.database_health)}
              <span className="font-medium capitalize">{status.database_health}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Edge Function</p>
            <div className={`flex items-center gap-2 ${getHealthColor(status.edge_function_health)}`}>
              {getHealthIcon(status.edge_function_health)}
              <span className="font-medium capitalize">{status.edge_function_health}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Transações (24h)</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{status.recent_transactions}</Badge>
              {status.failed_transactions > 0 && (
                <Badge variant="destructive">{status.failed_transactions} falhas</Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
            <div className="flex items-center gap-2">
              <Badge 
                className={
                  status.success_rate >= 95 ? "bg-success text-white" :
                  status.success_rate >= 90 ? "bg-warning text-white" :
                  "bg-destructive text-white"
                }
              >
                {status.success_rate.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-border">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Último pagamento bem-sucedido:</span>
          <span>{formatDate(status?.last_successful_payment || null)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Última verificação:</span>
          <span>{lastCheck ? lastCheck.toLocaleTimeString('pt-BR') : 'Nunca'}</span>
        </div>
      </div>

      {status && (status.database_health === 'error' || status.edge_function_health === 'error') && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <h4 className="font-medium text-destructive mb-2">⚠️ Atenção Necessária</h4>
          <p className="text-sm text-muted-foreground">
            Sistema de pagamentos com problemas detectados. 
            Verifique os logs das Edge Functions e conexão com o banco de dados.
          </p>
        </div>
      )}
    </Card>
  )
}