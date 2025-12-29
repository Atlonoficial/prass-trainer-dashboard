import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { PushNotifications } from '@capacitor/push-notifications'

interface PushTokenRow {
  id: string
  token: string
  user_id: string
  platform?: 'ios' | 'android' | 'web'
  device_info?: Record<string, any>
  created_at?: string
  updated_at?: string
  last_seen_at?: string
}

export function useFCMTokens() {
  const [tokens, setTokens] = useState<PushTokenRow[]>([])
  const [loading, setLoading] = useState(false)
  const [currentToken, setCurrentToken] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const upsertToken = async (token: string, platform: 'ios' | 'android' | 'web' = 'web') => {
    if (!user?.id) return null
    const { data, error } = await (supabase as any)
      .from('push_tokens')
      .upsert({ user_id: user.id, token, platform, device_info: { ua: navigator.userAgent } }, { onConflict: 'token' })
      .select()
    if (error) throw error
    return ((data || [])[0] as unknown) as PushTokenRow | undefined
  }

  const registerFCMToken = async (): Promise<string | null> => {
    if (!user?.id) {
      toast({ title: 'Sessão necessária', description: 'Faça login para ativar push notifications', variant: 'destructive' })
      return null
    }
    setLoading(true)
    try {
      const perm = await PushNotifications.requestPermissions()
      if (perm.receive !== 'granted') {
        toast({ title: 'Permissão negada', description: 'Notificações foram bloqueadas' })
        return null
      }

      const token = await new Promise<string>((resolve, reject) => {
        const onReg = (t: { value: string }) => {
          PushNotifications.removeAllListeners()
          resolve(t.value)
        }
        const onErr = (e: any) => {
          PushNotifications.removeAllListeners()
          reject(e)
        }
        PushNotifications.addListener('registration', onReg)
        PushNotifications.addListener('registrationError', onErr)
        PushNotifications.register()
      })

      await upsertToken(token, 'web')
      setCurrentToken(token)
      toast({ title: 'Push habilitado', description: 'Dispositivo registrado com sucesso' })
      await fetchUserTokens()
      return token
    } catch (error) {
      console.error('Push registration error:', error)
      toast({ title: 'Erro', description: 'Falha ao registrar dispositivo', variant: 'destructive' })
      return null
    } finally {
      setLoading(false)
    }
  }

  const fetchUserTokens = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('push_tokens')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      if (error) throw error
      setTokens(((data || []) as unknown) as PushTokenRow[])
    } catch (error) {
      console.error('Error fetching push tokens:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeToken = async (tokenId: string) => {
    try {
      await (supabase as any).from('push_tokens').delete().eq('id', tokenId)
      setTokens((prev) => prev.filter((t) => t.id !== tokenId))
      toast({ title: 'Dispositivo removido', description: 'O dispositivo não receberá mais notificações' })
    } catch (error) {
      console.error('Error removing token:', error)
      toast({ title: 'Erro', description: 'Não foi possível remover o dispositivo', variant: 'destructive' })
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchUserTokens()
    } else {
      setTokens([])
      setCurrentToken(null)
    }
  }, [user?.id])

  return { tokens, currentToken, loading, registerFCMToken, removeToken, fetchUserTokens }
}
