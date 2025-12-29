import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface MFASettings {
  id: string
  is_enabled: boolean
  phone_number: string | null
  backup_codes: string[] | null
  created_at: string
  updated_at: string
}

export function use2FA() {
  const [mfaSettings, setMfaSettings] = useState<MFASettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEnabling, setIsEnabling] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchMFASettings = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('user_mfa_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error
      }

      setMfaSettings(data || null)
    } catch (error: any) {
      console.error('Error fetching MFA settings:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações de 2FA',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const enable2FA = async (phoneNumber: string) => {
    if (!user) return false

    try {
      setIsEnabling(true)

      // Generate backup codes
      const { data: backupCodes, error: codesError } = await supabase
        .rpc('generate_backup_codes')

      if (codesError) throw codesError

      // Create or update MFA settings
      const { data, error } = await supabase
        .from('user_mfa_settings')
        .upsert({
          user_id: user.id,
          is_enabled: true,
          phone_number: phoneNumber,
          backup_codes: backupCodes
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) throw error

      // Log security activity
      await supabase.rpc('log_security_activity', {
        p_user_id: user.id,
        p_activity_type: '2fa_enabled',
        p_activity_description: 'Autenticação de dois fatores ativada',
        p_success: true
      })

      setMfaSettings(data)

      toast({
        title: 'Sucesso',
        description: '2FA ativado com sucesso! Guarde seus códigos de backup em local seguro.'
      })

      return { success: true, backupCodes }
    } catch (error: any) {
      console.error('Error enabling 2FA:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar o 2FA',
        variant: 'destructive'
      })
      return { success: false }
    } finally {
      setIsEnabling(false)
    }
  }

  const disable2FA = async () => {
    if (!user) return false

    try {
      setIsDisabling(true)

      const { error } = await supabase
        .from('user_mfa_settings')
        .update({
          is_enabled: false,
          phone_number: null,
          backup_codes: null
        })
        .eq('user_id', user.id)

      if (error) throw error

      // Log security activity
      await supabase.rpc('log_security_activity', {
        p_user_id: user.id,
        p_activity_type: '2fa_disabled',
        p_activity_description: 'Autenticação de dois fatores desativada',
        p_success: true
      })

      await fetchMFASettings()

      toast({
        title: 'Sucesso',
        description: '2FA desativado com sucesso'
      })

      return true
    } catch (error: any) {
      console.error('Error disabling 2FA:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível desativar o 2FA',
        variant: 'destructive'
      })
      return false
    } finally {
      setIsDisabling(false)
    }
  }

  const sendVerificationCode = async (phoneNumber: string) => {
    // Mock implementation - in production, integrate with SMS service
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Generate a mock verification code (in production, this would be sent via SMS)
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Store the code temporarily (in production, store server-side)
      sessionStorage.setItem('mfa_verification_code', verificationCode)
      sessionStorage.setItem('mfa_verification_phone', phoneNumber)
      
      console.log(`Mock SMS: Seu código de verificação é: ${verificationCode}`)
      
      toast({
        title: 'Código enviado',
        description: `Código de verificação enviado para ${phoneNumber}. (Modo demo: ${verificationCode})`,
      })
      
      return true
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o código de verificação',
        variant: 'destructive'
      })
      return false
    }
  }

  const verifyCode = async (code: string, phoneNumber: string) => {
    try {
      // Mock verification (in production, verify with backend)
      const storedCode = sessionStorage.getItem('mfa_verification_code')
      const storedPhone = sessionStorage.getItem('mfa_verification_phone')
      
      if (storedCode === code && storedPhone === phoneNumber) {
        // Clear stored verification data
        sessionStorage.removeItem('mfa_verification_code')
        sessionStorage.removeItem('mfa_verification_phone')
        
        return true
      } else {
        toast({
          title: 'Código inválido',
          description: 'O código informado está incorreto',
          variant: 'destructive'
        })
        return false
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível verificar o código',
        variant: 'destructive'
      })
      return false
    }
  }

  const regenerateBackupCodes = async () => {
    if (!user || !mfaSettings?.is_enabled) return null

    try {
      // Generate new backup codes
      const { data: backupCodes, error: codesError } = await supabase
        .rpc('generate_backup_codes')

      if (codesError) throw codesError

      // Update settings with new codes
      const { error } = await supabase
        .from('user_mfa_settings')
        .update({ backup_codes: backupCodes })
        .eq('user_id', user.id)

      if (error) throw error

      // Log security activity
      await supabase.rpc('log_security_activity', {
        p_user_id: user.id,
        p_activity_type: 'backup_codes_regenerated',
        p_activity_description: 'Códigos de backup regenerados',
        p_success: true
      })

      await fetchMFASettings()

      toast({
        title: 'Sucesso',
        description: 'Códigos de backup regenerados com sucesso'
      })

      return backupCodes
    } catch (error: any) {
      console.error('Error regenerating backup codes:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível regenerar os códigos de backup',
        variant: 'destructive'
      })
      return null
    }
  }

  useEffect(() => {
    if (user) {
      fetchMFASettings()
    }
  }, [user])

  return {
    mfaSettings,
    loading,
    isEnabling,
    isDisabling,
    enable2FA,
    disable2FA,
    sendVerificationCode,
    verifyCode,
    regenerateBackupCodes,
    refreshSettings: fetchMFASettings
  }
}