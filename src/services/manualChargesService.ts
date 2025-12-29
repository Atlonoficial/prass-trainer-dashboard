import { supabase } from '@/integrations/supabase/client'
import { Database } from '@/integrations/supabase/types'
import { toast } from 'sonner'

export type ManualCharge = Database['public']['Tables']['manual_charges']['Row']
export type ManualChargeInsert = Database['public']['Tables']['manual_charges']['Insert']

export interface ContentToUnlock {
  type: 'course' | 'plan' | 'workout' | 'material' | 'feature'
  id: string
  name: string
  expires_at?: string
}

export interface CreateChargeData {
  student_id: string
  plan_id?: string
  amount: number
  due_date: string
  content_to_unlock: ContentToUnlock[]
  recurring_interval?: string
  notes?: string
}

class ManualChargesService {
  async create(data: CreateChargeData): Promise<ManualCharge | null> {
    try {
      console.log('💳 [CHARGES_SERVICE] Creating charge:', data)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Usuário não autenticado')
        return null
      }

      const insertData: ManualChargeInsert = {
        teacher_id: user.id,
        student_id: data.student_id,
        plan_id: data.plan_id,
        amount: data.amount,
        due_date: data.due_date,
        content_to_unlock: data.content_to_unlock as any,
        recurring_interval: data.recurring_interval,
        notes: data.notes,
        currency: 'BRL',
        status: 'pending'
      }

      const { data: charge, error } = await supabase
        .from('manual_charges')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('❌ [CHARGES_SERVICE] Error creating charge:', error)
        toast.error('Erro ao criar cobrança')
        return null
      }

      console.log('✅ [CHARGES_SERVICE] Charge created:', charge.id)
      toast.success('Cobrança criada com sucesso!')
      return charge

    } catch (error) {
      console.error('💥 [CHARGES_SERVICE] Unexpected error:', error)
      toast.error('Erro inesperado ao criar cobrança')
      return null
    }
  }

  async generatePaymentLink(chargeId: string): Promise<string | null> {
    try {
      console.log('🔗 [CHARGES_SERVICE] Generating payment link for:', chargeId)

      const { data: charge, error: fetchError } = await supabase
        .from('manual_charges')
        .select('*')
        .eq('id', chargeId)
        .single()

      if (fetchError || !charge) {
        toast.error('Cobrança não encontrada')
        return null
      }

      const { data, error } = await supabase.functions.invoke('generate-payment-link', {
        body: {
          chargeId: charge.id,
          amount: charge.amount,
          description: `Cobrança - ${charge.notes || 'Plano'}`,
          studentId: charge.student_id,
          teacherId: charge.teacher_id,
          planId: charge.plan_id,
          dueDate: charge.due_date
        }
      })

      if (error) {
        console.error('❌ [CHARGES_SERVICE] Error generating link:', error)
        toast.error('Erro ao gerar link de pagamento')
        return null
      }

      console.log('✅ [CHARGES_SERVICE] Payment link generated:', data.payment_link)
      return data.payment_link

    } catch (error) {
      console.error('💥 [CHARGES_SERVICE] Unexpected error:', error)
      toast.error('Erro inesperado ao gerar link')
      return null
    }
  }

  async getAll(teacherId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('manual_charges')
        .select(`
          *,
          student:profiles!student_id(
            id,
            name,
            email,
            phone
          )
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [CHARGES_SERVICE] Error fetching charges:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('💥 [CHARGES_SERVICE] Unexpected error:', error)
      return []
    }
  }

  async getByStudent(studentId: string): Promise<ManualCharge[]> {
    try {
      const { data, error } = await supabase
        .from('manual_charges')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [CHARGES_SERVICE] Error fetching charges:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('💥 [CHARGES_SERVICE] Unexpected error:', error)
      return []
    }
  }

  async cancel(chargeId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('manual_charges')
        .update({
          status: 'cancelled',
          notes: reason
        })
        .eq('id', chargeId)

      if (error) {
        console.error('❌ [CHARGES_SERVICE] Error cancelling charge:', error)
        toast.error('Erro ao cancelar cobrança')
        return false
      }

      toast.success('Cobrança cancelada com sucesso!')
      return true

    } catch (error) {
      console.error('💥 [CHARGES_SERVICE] Unexpected error:', error)
      toast.error('Erro inesperado ao cancelar cobrança')
      return false
    }
  }

  async delete(chargeId: string): Promise<boolean> {
    try {
      console.log('🗑️ [CHARGES_SERVICE] Deleting charge:', chargeId)

      const { error } = await supabase
        .from('manual_charges')
        .delete()
        .eq('id', chargeId)

      if (error) {
        console.error('❌ [CHARGES_SERVICE] Error deleting charge:', error)
        toast.error('Erro ao deletar cobrança')
        return false
      }

      console.log('✅ [CHARGES_SERVICE] Charge deleted successfully')
      toast.success('Cobrança deletada com sucesso!')
      return true

    } catch (error) {
      console.error('💥 [CHARGES_SERVICE] Unexpected error:', error)
      toast.error('Erro inesperado ao deletar cobrança')
      return false
    }
  }
}

export const manualChargesService = new ManualChargesService()