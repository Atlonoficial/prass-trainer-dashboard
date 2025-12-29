import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface GlobalPaymentSettings {
  id: string
  gateway_type: string
  credentials: any
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Hook para acessar configurações GLOBAIS de pagamento
 * Substituição do useTeacherPaymentSettings para sistema centralizado
 */
export function useGlobalPaymentSettings() {
  const [settings, setSettings] = useState<GlobalPaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('system_payment_config')
        .select('*')
        .eq('gateway_type', 'mercadopago')
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - sistema não configurado
          setSettings(null)
        } else {
          throw error
        }
      } else {
        setSettings(data)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações globais:', error)
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    refetch: fetchSettings
  }
}
