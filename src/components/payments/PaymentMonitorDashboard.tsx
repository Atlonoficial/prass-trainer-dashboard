import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, TrendingUp, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Transaction {
  id: string
  amount: number
  currency: string
  status: string
  created_at: string
  item_name: string
  gateway_type: string
  gateway_transaction_id: string
  student_id: string
  teacher_id: string
  checkout_url?: string
  expires_at?: string
}

interface PaymentMetrics {
  total_revenue: number
  pending_count: number
  paid_count: number
  failed_count: number
  conversion_rate: number
  avg_transaction_value: number
}

export function PaymentMonitorDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      // Buscar transações recentes
      const { data: transactionData, error: transactionError } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (transactionError) throw transactionError

      // Buscar métricas - usar função local se RPC não disponível
      setMetrics(calculateLocalMetrics(transactionData || []))
      setLastUpdate(new Date())
      
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de pagamento",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Calcular métricas localmente se RPC não estiver disponível
  const calculateLocalMetrics = (transactions: Transaction[]): PaymentMetrics => {
    const paid = transactions.filter(t => t.status === 'paid')
    const pending = transactions.filter(t => t.status === 'pending')
    const failed = transactions.filter(t => ['failed', 'cancelled'].includes(t.status))
    
    const totalRevenue = paid.reduce((sum, t) => sum + t.amount, 0)
    const avgTransactionValue = paid.length > 0 ? totalRevenue / paid.length : 0
    const conversionRate = transactions.length > 0 ? (paid.length / transactions.length) * 100 : 0

    return {
      total_revenue: totalRevenue,
      pending_count: pending.length,
      paid_count: paid.length,
      failed_count: failed.length,
      conversion_rate: conversionRate,
      avg_transaction_value: avgTransactionValue
    }
  }

  useEffect(() => {
    fetchData()
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const displayMetrics = metrics || calculateLocalMetrics(transactions)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Pago</Badge>
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>
      case 'cancelled':
        return <Badge variant="outline">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com atualização */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitor de Pagamentos</h2>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground">
              Última atualização: {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
            </p>
          )}
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {displayMetrics.total_revenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayMetrics.conversion_rate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {displayMetrics.paid_count}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {displayMetrics.pending_count}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de transações */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Todas ({transactions.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes ({displayMetrics.pending_count})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Pagas ({displayMetrics.paid_count})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Falhas ({displayMetrics.failed_count})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TransactionList transactions={transactions} getStatusIcon={getStatusIcon} getStatusBadge={getStatusBadge} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <TransactionList 
            transactions={transactions.filter(t => t.status === 'pending')} 
            getStatusIcon={getStatusIcon} 
            getStatusBadge={getStatusBadge} 
          />
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          <TransactionList 
            transactions={transactions.filter(t => t.status === 'paid')} 
            getStatusIcon={getStatusIcon} 
            getStatusBadge={getStatusBadge} 
          />
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <TransactionList 
            transactions={transactions.filter(t => ['failed', 'cancelled'].includes(t.status))} 
            getStatusIcon={getStatusIcon} 
            getStatusBadge={getStatusBadge} 
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface TransactionListProps {
  transactions: Transaction[]
  getStatusIcon: (status: string) => React.ReactNode
  getStatusBadge: (status: string) => React.ReactNode
}

function TransactionList({ transactions, getStatusIcon, getStatusBadge }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Nenhuma transação encontrada</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <Card key={transaction.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              {getStatusIcon(transaction.status)}
              <div>
                <p className="font-medium">{transaction.item_name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(transaction.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-bold">R$ {transaction.amount.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">{transaction.gateway_type}</p>
              </div>
              {getStatusBadge(transaction.status)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}