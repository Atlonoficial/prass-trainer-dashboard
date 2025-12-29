import { useUnifiedApp } from '@/contexts/UnifiedAppProvider'
import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

/**
 * Compatibility hook that replaces useOptimizedProfile
 * Uses the new unified system while maintaining the same interface
 */
export function useOptimizedProfile() {
  const { userProfile, userId, refetchProfile, loading } = useUnifiedApp()
  const { toast } = useToast()

  const createProfile = useCallback(async (profileData: any) => {
    if (!userId) return { success: false, error: 'No user ID' }

    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          ...profileData
        })

      if (error) throw error

      toast({
        title: "Perfil criado com sucesso!",
        description: "Suas informações foram salvas."
      })

      await refetchProfile()
      return { success: true }
    } catch (error: any) {
      console.error('Error creating profile:', error)
      toast({
        title: "Erro ao criar perfil",
        description: error.message,
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }, [userId, refetchProfile, toast])

  const updateProfile = useCallback(async (updates: any) => {
    if (!userId) return { success: false, error: 'No user ID' }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (error) throw error

      toast({
        title: "Perfil atualizado!",
        description: "Suas alterações foram salvas."
      })

      await refetchProfile()
      return { success: true }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }, [userId, refetchProfile, toast])

  return {
    profile: userProfile,
    userProfile,
    loading: loading.profile,
    createProfile,
    updateProfile,
    refetch: refetchProfile
  }
}