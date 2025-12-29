import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface Payment {
  id: string
  user_id?: string | null
  amount: number
  currency?: string | null
  status?: string | null
  description: string
  transaction_id?: string | null
  invoice_number?: string | null
  invoice_url?: string | null
  due_date?: string | null
  paid_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setPayments((data || []) as Payment[])
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar os pagamentos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const addPayment = async (paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase.from('payments').insert([paymentData as any]).select().single()
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Pagamento registrado com sucesso' })
      return data as Payment
    } catch (error) {
      console.error('Error adding payment:', error)
      toast({ title: 'Erro', description: 'Não foi possível registrar o pagamento', variant: 'destructive' })
      throw error
    }
  }

  const updatePaymentStatus = async (id: string, status: Payment['status'], paid_at?: string) => {
    try {
      const update: any = { status }
      if (paid_at) update.paid_at = paid_at
      const { data, error } = await supabase.from('payments').update(update).eq('id', id).select().single()
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Status do pagamento atualizado' })
      return data as Payment
    } catch (error) {
      console.error('Error updating payment:', error)
      toast({ title: 'Erro', description: 'Não foi possível atualizar o pagamento', variant: 'destructive' })
      throw error
    }
  }

  useEffect(() => { fetchPayments() }, [])

  return { payments, loading, addPayment, updatePaymentStatus, refetch: fetchPayments }
}
