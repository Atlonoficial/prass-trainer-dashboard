import { useState, useEffect, useCallback } from 'react'
import { manualChargesService, ManualCharge, CreateChargeData } from '@/services/manualChargesService'
import { toast } from 'sonner'

export function useManualCharges(teacherId?: string) {
  const [charges, setCharges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingCharge, setCreatingCharge] = useState(false)

  const fetchCharges = useCallback(async () => {
    if (!teacherId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await manualChargesService.getAll(teacherId)
      setCharges(data)
    } catch (error) {
      console.error('Error fetching charges:', error)
      toast.error('Erro ao carregar cobranças')
    } finally {
      setLoading(false)
    }
  }, [teacherId])

  useEffect(() => {
    fetchCharges()
  }, [fetchCharges])

  const createCharge = useCallback(async (data: CreateChargeData): Promise<ManualCharge | null> => {
    setCreatingCharge(true)
    try {
      const charge = await manualChargesService.create(data)
      if (charge) {
        await fetchCharges()
      }
      return charge
    } finally {
      setCreatingCharge(false)
    }
  }, [fetchCharges])

  const generatePaymentLink = useCallback(async (chargeId: string): Promise<string | null> => {
    const link = await manualChargesService.generatePaymentLink(chargeId)
    if (link) {
      await fetchCharges()
    }
    return link
  }, [fetchCharges])

  const cancelCharge = useCallback(async (chargeId: string, reason: string): Promise<boolean> => {
    const success = await manualChargesService.cancel(chargeId, reason)
    if (success) {
      await fetchCharges()
    }
    return success
  }, [fetchCharges])

  const deleteCharge = useCallback(async (chargeId: string): Promise<boolean> => {
    const success = await manualChargesService.delete(chargeId)
    if (success) {
      await fetchCharges()
    }
    return success
  }, [fetchCharges])

  const sendWhatsApp = useCallback(async (chargeId: string, studentPhone: string, paymentLink: string) => {
    const charge = charges.find(c => c.id === chargeId)
    if (!charge) return

    // Buscar nome do aluno
    const studentName = charge.student?.name || 'Aluno'

    // Mensagem personalizada
    const message = `Olá ${studentName}! 👋

💰 *Nova Cobrança Disponível*

📋 Valor: *R$ ${charge.amount.toFixed(2)}*
📅 Vencimento: ${new Date(charge.due_date).toLocaleDateString('pt-BR')}

🔗 *Link para pagamento:*
${paymentLink}

✅ Após confirmar o pagamento, seu acesso será liberado automaticamente!

_Qualquer dúvida, estou à disposição!_ 😊`

    const whatsappUrl = `https://wa.me/55${studentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')

    toast.success('WhatsApp aberto! Mensagem pronta para enviar 📱')
  }, [charges])

  return {
    charges,
    loading,
    creatingCharge,
    createCharge,
    generatePaymentLink,
    cancelCharge,
    deleteCharge,
    sendWhatsApp,
    refetch: fetchCharges
  }
}