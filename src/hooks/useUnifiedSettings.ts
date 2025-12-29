import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface UnifiedNotificationSettings {
  email: boolean
  sms: boolean
  push: boolean
  marketing: boolean
  achievements: boolean
  schedule_updates: boolean
  teacher_messages: boolean
  workout_reminders: boolean
}

export function useUnifiedSettings() {
  const [notifications, setNotifications] = useState<UnifiedNotificationSettings>({ 
    email: true, 
    sms: false, 
    push: true, 
    marketing: false,
    achievements: true,
    schedule_updates: true,
    teacher_messages: true,
    workout_reminders: true
  })
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const saveNotificationSettings = async (settings: UnifiedNotificationSettings) => {
    if (!user) return
    try {
      // Save to profiles table (unified source of truth)
      const { error } = await supabase
        .from('profiles')
        .update({ 
          notification_preferences: settings as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      // Also update user_settings for backward compatibility
      await supabase.from('user_settings').upsert({ 
        user_id: user.id, 
        email_notifications: settings.email, 
        sms_notifications: settings.sms, 
        push_notifications: settings.push, 
        marketing_notifications: settings.marketing 
      })

      setNotifications(settings)
      toast({ title: 'Sucesso', description: 'Configurações de notificação salvas' })
    } catch (error) {
      console.error('Error saving notification settings:', error)
      toast({ title: 'Erro', description: 'Não foi possível salvar as configurações', variant: 'destructive' })
    }
  }

  const fetchSettings = async () => {
    if (!user) return
    try {
      setLoading(true)
      // Get from profiles (source of truth)
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error
      
      if (data?.notification_preferences) {
        const prefs = data.notification_preferences as any
        setNotifications({
          email: prefs.email ?? true,
          sms: prefs.sms ?? false,
          push: prefs.push ?? true,
          marketing: prefs.marketing ?? false,
          achievements: prefs.achievements ?? true,
          schedule_updates: prefs.schedule_updates ?? true,
          teacher_messages: prefs.teacher_messages ?? true,
          workout_reminders: prefs.workout_reminders ?? true
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    if (user) { 
      fetchSettings()
    } 
  }, [user?.id])

  return { 
    notifications, 
    loading, 
    saveNotificationSettings, 
    setNotifications,
    refetch: fetchSettings
  }
}