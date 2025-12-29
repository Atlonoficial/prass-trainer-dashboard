import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ManualCharge } from '@/services/manualChargesService'
import { useManualCharges } from '@/hooks/useManualCharges'
import { toast } from 'sonner'
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  XCircle,
  MessageCircle,
  Link as LinkIcon,
  Trash2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ManualChargesDashboardProps {
  teacherId: string
}

export function ManualChargesDashboard({ teacherId }: ManualChargesDashboardProps) {
  const { charges, loading, generatePaymentLink, sendWhatsApp, deleteCharge } = useManualCharges(teacherId)
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [chargeToDelete, setChargeToDelete] = useState<string | null>(null)

  const filteredCharges = charges.filter(charge => 
    statusFilter === 'all' || charge.status === statusFilter
  )

  const handleGenerateAndSend = async (charge: ManualCharge & { student: any }) => {
    setGeneratingLink(charge.id)
    try {
      // Gerar link se não existir
      let paymentLink = charge.payment_link
      if (!paymentLink) {
        paymentLink = await generatePaymentLink(charge.id)
        if (!paymentLink) {
          return
        }
      }

      // Abrir WhatsApp
      await sendWhatsApp(charge.id, charge.student.phone || '', paymentLink)
    } finally {
      setGeneratingLink(null)
    }
  }

  const handleDeleteClick = (chargeId: string) => {
    setChargeToDelete(chargeId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!chargeToDelete) return
    
    const success = await deleteCharge(chargeToDelete)
    if (success) {
      setDeleteDialogOpen(false)
      setChargeToDelete(null)
    }
  }

  const getStatusBadge = (status: ManualCharge['status']) => {
    const styles = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      sent: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      paid: 'bg-green-500/10 text-green-500 border-green-500/20',
      overdue: 'bg-red-500/10 text-red-500 border-red-500/20',
      cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }

    const labels = {
      pending: 'Pendente',
      sent: 'Enviado',
      paid: 'Pago',
      overdue: 'Vencido',
      cancelled: 'Cancelado'
    }

    return (
      <Badge variant="outline" className={styles[status]}>
        {labels[status]}
      </Badge>
    )
  }

  const getStatusIcon = (status: ManualCharge['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'overdue':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'sent':
        return <MessageCircle className="h-5 w-5 text-blue-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cobranças Manuais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Cobranças Manuais
        </CardTitle>
        <CardDescription>
          Gerencie e envie cobranças via WhatsApp
        </CardDescription>
        
        <div className="flex gap-2 mt-4">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            Todas ({charges.length})
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
          >
            Pendentes ({charges.filter(c => c.status === 'pending').length})
          </Button>
          <Button
            variant={statusFilter === 'paid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('paid')}
          >
            Pagas ({charges.filter(c => c.status === 'paid').length})
          </Button>
          <Button
            variant={statusFilter === 'overdue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('overdue')}
            className={statusFilter === 'overdue' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-600/20 hover:bg-red-600/10'}
          >
            <XCircle className="w-3 h-3 mr-1" />
            Vencidas ({charges.filter(c => c.status === 'overdue').length})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredCharges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma cobrança {statusFilter !== 'all' && `com status "${statusFilter}"`} encontrada</p>
            </div>
          ) : (
            filteredCharges.map((charge: any) => (
              <Card key={charge.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(charge.status)}
                      <div>
                        <p className="font-semibold">{charge.student?.name || 'Aluno'}</p>
                        <p className="text-sm text-muted-foreground">{charge.student?.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(charge.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">R$ {charge.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(charge.due_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  {charge.notes && (
                    <p className="text-sm text-muted-foreground mb-4">{charge.notes}</p>
                  )}

                  {charge.content_to_unlock && charge.content_to_unlock.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Conteúdo a Desbloquear:</p>
                      <div className="flex flex-wrap gap-1">
                        {charge.content_to_unlock.map((content: any, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {content.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <Clock className="h-3 w-3" />
                    <span>
                      Criado {formatDistanceToNow(new Date(charge.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>

                  {charge.status === 'overdue' && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span className="font-medium">
                          Vencido há {Math.floor((Date.now() - new Date(charge.due_date).getTime()) / (1000 * 60 * 60 * 24))} dias
                        </span>
                      </div>
                    </div>
                  )}

                  {charge.status !== 'paid' && charge.status !== 'cancelled' && (
                    <div className="flex gap-2">
                      {charge.payment_link ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(charge.payment_link)
                              toast.success('Link copiado para área de transferência! ✅')
                            }}
                            className="flex-1"
                          >
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Copiar Link
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateAndSend(charge)}
                            disabled={generatingLink === charge.id}
                            className="flex-1"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Enviar WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(charge.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateAndSend(charge)}
                            disabled={generatingLink === charge.id}
                            className="flex-1"
                          >
                            {generatingLink === charge.id ? (
                              'Gerando...'
                            ) : (
                              <>
                                <LinkIcon className="h-4 w-4 mr-2" />
                                Gerar Link e Enviar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(charge.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Cobrança?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A cobrança será permanentemente removida do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}