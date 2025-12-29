import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface NotificationSettings {
  email: boolean
  sms: boolean
  push: boolean
  marketing: boolean
}

export interface UserSession {
  id: string
  device: string
  location: string
  lastActive: Date
  isCurrentSession: boolean
}

export function useSettings() {
  const [notifications, setNotifications] = useState<NotificationSettings>({ email: true, sms: false, push: true, marketing: false })
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const saveNotificationSettings = async (settings: NotificationSettings) => {
    if (!user) return
    try {
      const { error } = await supabase.from('user_settings').upsert({ user_id: user.id, email_notifications: settings.email, sms_notifications: settings.sms, push_notifications: settings.push, marketing_notifications: settings.marketing })
      if (error) throw error
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
      const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle()
      if (error) throw error
      if (data) {
        setNotifications({ email: !!data.email_notifications, sms: !!data.sms_notifications, push: !!data.push_notifications, marketing: !!data.marketing_notifications })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateMockSessions = () => {
    const mockSessions: UserSession[] = [
      { id: '1', device: 'Chrome - Windows', location: getBrowserLocation(), lastActive: new Date(), isCurrentSession: true },
      { id: '2', device: 'Mobile App - Android', location: 'São Paulo, SP', lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), isCurrentSession: false },
      { id: '3', device: 'Safari - MacOS', location: 'Rio de Janeiro, RJ', lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000), isCurrentSession: false },
    ]
    setSessions(mockSessions)
  }

  const getBrowserLocation = () => 'São Paulo, SP'

  const revokeSession = async (sessionId: string) => {
    try {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast({ title: 'Sucesso', description: 'Sessão revogada com sucesso' })
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível revogar a sessão', variant: 'destructive' })
    }
  }

  useEffect(() => { if (user) { fetchSettings(); generateMockSessions() } }, [user?.id])

  return { notifications, sessions, loading, saveNotificationSettings, revokeSession, setNotifications }
}
