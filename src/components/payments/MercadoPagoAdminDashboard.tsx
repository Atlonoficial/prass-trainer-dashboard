// FASE 5: DASHBOARD DE MONITORAMENTO PARA ADMIN
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { AlertTriangle, CheckCircle, Clock, RefreshCw, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DashboardStats {
  total_transactions: number
  paid: number
  pending: number
  failed: number
  failed_webhooks: number
  retry_needed: number
  total_revenue: number
}

export function MercadoPagoAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_transactions: 0,
    paid: 0,
    pending: 0,
    failed: 0,
    failed_webhooks: 0,
    retry_needed: 0,
    total_revenue: 0
  })
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const { toast } = useToast()

  const fetchStats = async () => {
    try {
      setLoading(true)

      // Buscar transações do Mercado Pago
      const { data: transactions } = await supabase
        .from('payment_transactions')
        .select('status, amount')
        .eq('gateway_type', 'mercado_pago')

      // Buscar webhooks falhados (usando any para evitar erros de tipos não gerados)
      const { data: webhooks } = await (supabase as any)
        .from('webhook_events')
        .select('processed, retry_count') as { data: Array<{ processed: boolean; retry_count: number }> | null }

      const paid = transactions?.filter(t => t.status === 'paid').length || 0
      const pending = transactions?.filter(t => t.status === 'pending').length || 0
      const failed = transactions?.filter(t => t.status === 'failed').length || 0
      const failedWebhooks = webhooks?.filter((w: any) => !w.processed).length || 0
      const retryNeeded = webhooks?.filter((w: any) => !w.processed && w.retry_count < 5).length || 0
      
      const totalRevenue = transactions
        ?.filter(t => t.status === 'paid')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0

      setStats({
        total_transactions: transactions?.length || 0,
        paid,
        pending,
        failed,
        failed_webhooks: failedWebhooks,
        retry_needed: retryNeeded,
        total_revenue: totalRevenue
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar estatísticas",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const retryFailedWebhooks = async () => {
    setRetrying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Não autenticado')

      const { data, error } = await supabase.functions.invoke('retry-failed-webhooks', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (error) throw error

      toast({
        title: "✅ Retry concluído",
        description: `${data.processed} webhooks processados`,
      })
      
      await fetchStats()
    } catch (error: any) {
      toast({
        title: "Erro no retry",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setRetrying(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Atualizar a cada 30s
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Mercado Pago</h2>
          <p className="text-muted-foreground">Monitoramento em tempo real</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.total_revenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.paid} pagamentos confirmados
            </p>
          </CardContent>
        </Card>

        {/* Paid */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_transactions > 0 
                ? ((stats.paid / stats.total_transactions) * 100).toFixed(1)
                : 0}% do total
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando confirmação
            </p>
          </CardContent>
        </Card>

        {/* Failed Webhooks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Webhooks Falhados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed_webhooks}</div>
            {stats.retry_needed > 0 && (
              <Button 
                size="sm" 
                onClick={retryFailedWebhooks} 
                disabled={retrying}
                className="mt-2 w-full"
              >
                {retrying ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry {stats.retry_needed}
                  </>
                )}
              </Button>
            )}
            {stats.retry_needed === 0 && stats.failed_webhooks > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Máximo de tentativas atingido
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total de Transações</span>
              <Badge variant="outline">{stats.total_transactions}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Pagamentos Aprovados
              </span>
              <Badge className="bg-green-500">{stats.paid}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Clock className="h-3 w-3 text-yellow-500" />
                Aguardando Pagamento
              </span>
              <Badge className="bg-yellow-500">{stats.pending}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                Pagamentos Falhados
              </span>
              <Badge variant="destructive">{stats.failed}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
