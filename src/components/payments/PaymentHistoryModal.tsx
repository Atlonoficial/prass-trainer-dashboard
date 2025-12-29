import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, CreditCard, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { usePaymentProcessing, type PaymentTransaction } from '@/hooks/usePaymentProcessing'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PaymentHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  isTeacher?: boolean
}

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, variant: 'secondary' as const },
  processing: { label: 'Processando', icon: AlertCircle, variant: 'outline' as const },
  paid: { label: 'Pago', icon: CheckCircle, variant: 'default' as const },
  failed: { label: 'Falhou', icon: XCircle, variant: 'destructive' as const },
  refunded: { label: 'Reembolsado', icon: XCircle, variant: 'outline' as const }
}

export default function PaymentHistoryModal({ isOpen, onClose, isTeacher = false }: PaymentHistoryModalProps) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const { getTeacherTransactions, getStudentTransactions } = usePaymentProcessing()

  useEffect(() => {
    if (isOpen) {
      fetchTransactions()
    }
  }, [isOpen, isTeacher])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const data = isTeacher 
        ? await getTeacherTransactions()
        : await getStudentTransactions()
      setTransactions(data as PaymentTransaction[])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCheckoutUrl = (url: string) => {
    window.open(url, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Pagamentos
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma transação encontrada.
            </div>
          ) : (
            transactions.map(transaction => {
              const statusInfo = statusConfig[transaction.status]
              const StatusIcon = statusInfo.icon

              return (
                <Card key={transaction.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {(transaction as any).service_pricing?.name || 'Serviço'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Transaction Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Valor:</span>
                          <p className="font-medium">{transaction.currency} {transaction.amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Gateway:</span>
                          <p className="font-medium capitalize">{transaction.gateway_type.replace('_', ' ')}</p>
                        </div>
                        {transaction.payment_method && (
                          <div>
                            <span className="text-muted-foreground">Método:</span>
                            <p className="font-medium capitalize">{transaction.payment_method.replace('_', ' ')}</p>
                          </div>
                        )}
                        {transaction.paid_at && (
                          <div>
                            <span className="text-muted-foreground">Pago em:</span>
                            <p className="font-medium">
                              {format(new Date(transaction.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {(transaction as any).service_pricing?.description && (
                        <>
                          <Separator />
                          <div>
                            <span className="text-sm text-muted-foreground">Descrição:</span>
                            <p className="text-sm mt-1">{(transaction as any).service_pricing.description}</p>
                          </div>
                        </>
                      )}

                      {/* Actions */}
                      {(transaction.status === 'pending' && transaction.checkout_url) && (
                        <>
                          <Separator />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCheckoutUrl(transaction.checkout_url!)}
                            className="w-full"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Finalizar Pagamento
                          </Button>
                        </>
                      )}

                      {/* Expires Info */}
                      {transaction.expires_at && transaction.status === 'pending' && (
                        <div className="text-xs text-muted-foreground">
                          Expira em: {format(new Date(transaction.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}