import { useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface BannerInteraction {
  bannerId: string
  type: 'view' | 'click'
  metadata?: Record<string, any>
}

export function useBannerTracking() {
  const { user } = useAuth()
  const { toast } = useToast()

  const trackInteraction = useCallback(async (interaction: BannerInteraction) => {
    console.log('[DEBUG] 🎯 Starting tracking interaction:', {
      hasUser: !!user,
      userId: user?.id,
      interaction,
      timestamp: new Date().toISOString()
    })

    if (!user) {
      console.error('[DEBUG] ❌ No authenticated user for tracking interaction')
      return
    }

    try {
      // Payload simplificado para debug
      const payload = {
        banner_id: interaction.bannerId,
        user_id: user.id,
        interaction_type: interaction.type,
        metadata: interaction.metadata || {}
      }
      
      console.log('[DEBUG] 📤 Sending payload:', payload)
      
      const { data, error } = await supabase
        .from('banner_interactions')
        .insert(payload)
        .select()

      console.log('[DEBUG] 📥 Response received:', { data, error })

      if (error) {
        console.error('[DEBUG] ❌ Database error:', {
          error: error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Log error but don't show toast to user in production
        console.error('[DEBUG] Banner tracking failed:', error.message)
        
        throw error
      } else {
        console.log('[DEBUG] ✅ Success! Data inserted:', data)
        
        console.log('[DEBUG] ✅ Success! Data inserted:', data)
        // Remover toast de sucesso para uso em produção
        // toast({
        //   title: '✅ Tracking Sucesso',
        //   description: `${interaction.type} registrado!`,
        //   duration: 2000
        // })
      }
      
    } catch (error: any) {
      console.error('[DEBUG] 💥 Catch block error:', {
        error: error,
        message: error?.message,
        stack: error?.stack
      })
    }
  }, [user, toast])

  const trackDetailView = useCallback((bannerId: string, metadata?: Record<string, any>) => {
    if (!user) return

    console.log('[useBannerTracking] Tracking view for banner:', bannerId, metadata)

    trackInteraction({
      bannerId,
      type: 'view',
      metadata: {
        ...metadata,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    })
  }, [user, trackInteraction])

  const trackRedirectClick = useCallback((bannerId: string, metadata?: Record<string, any>) => {
    if (!user) return

    console.log('[useBannerTracking] Tracking click for banner:', bannerId, metadata)

    trackInteraction({
      bannerId,
      type: 'click',
      metadata: {
        ...metadata,
        clickPosition: metadata?.clickPosition || null
      }
    })
  }, [user, trackInteraction])

  return {
    trackDetailView,
    trackRedirectClick
  }
}