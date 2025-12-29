import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface PaymentTransaction {
  id: string
  teacher_id: string
  student_id: string
  service_pricing_id: string
  gateway_type: string
  gateway_transaction_id?: string
  gateway_payment_id?: string
  amount: number
  currency: string
  status: string
  payment_method?: string
  checkout_url?: string
  gateway_response: any
  metadata: any
  expires_at?: string
  paid_at?: string
  created_at: string
  updated_at: string
}

export function usePaymentProcessing() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const createCheckout = async (planId?: string | null, courseId?: string | null, paymentMethod: string = 'pix') => {
    try {
      setLoading(true)

      const body: any = { payment_method: paymentMethod }
      
      if (planId) {
        body.plan_id = planId
        console.log('[usePaymentProcessing] Creating checkout with plan_id:', planId)
      }
      if (courseId) {
        body.course_id = courseId
        console.log('[usePaymentProcessing] Creating checkout with course_id:', courseId)
      }

      console.log('[usePaymentProcessing] Invoking checkout with body:', body)

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body
      })

      if (error) {
        console.error('[usePaymentProcessing] Edge function error:', error)
        throw error
      }

      if (data.error) {
        console.error('[usePaymentProcessing] Edge function returned error:', data.error)
        throw new Error(data.error)
      }

      console.log('[usePaymentProcessing] Checkout created successfully:', data)
      return data
    } catch (error) {
      console.error('[usePaymentProcessing] Error creating checkout:', error)
      toast({
        title: 'Erro no Pagamento',
        description: error instanceof Error ? error.message : 'Não foi possível processar o pagamento',
        variant: 'destructive'
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const getTransactionStatus = async (transactionId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .single()

      if (error) throw error
      return data as PaymentTransaction
    } catch (error) {
      console.error('Error fetching transaction status:', error)
      throw error
    }
  }

  const getTeacherTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          service_pricing:service_pricing_id(name, description),
          student:student_id(*)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching teacher transactions:', error)
      return []
    }
  }

  const getStudentTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          service_pricing:service_pricing_id(name, description),
          teacher:teacher_id(*)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching student transactions:', error)
      return []
    }
  }

  const getPaymentMetrics = async (startDate?: string, endDate?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      let query = supabase
        .from('payment_transactions')
        .select('amount, status, paid_at, currency')
        .eq('teacher_id', user.id)

      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      const metrics = {
        total_revenue: 0,
        paid_transactions: 0,
        pending_transactions: 0,
        failed_transactions: 0,
        transactions_by_month: {} as Record<string, number>,
        revenue_by_month: {} as Record<string, number>
      }

      data?.forEach(transaction => {
        if (transaction.status === 'paid') {
          metrics.total_revenue += Number(transaction.amount)
          metrics.paid_transactions++

          if (transaction.paid_at) {
            const month = new Date(transaction.paid_at).toISOString().substring(0, 7)
            metrics.transactions_by_month[month] = (metrics.transactions_by_month[month] || 0) + 1
            metrics.revenue_by_month[month] = (metrics.revenue_by_month[month] || 0) + Number(transaction.amount)
          }
        } else if (transaction.status === 'pending' || transaction.status === 'processing') {
          metrics.pending_transactions++
        } else if (transaction.status === 'failed') {
          metrics.failed_transactions++
        }
      })

      return metrics
    } catch (error) {
      console.error('Error fetching payment metrics:', error)
      return null
    }
  }

  return {
    loading,
    createCheckout,
    getTransactionStatus,
    getTeacherTransactions,
    getStudentTransactions,
    getPaymentMetrics
  }
}