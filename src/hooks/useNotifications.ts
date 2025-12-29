import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

export interface Notification {
  id: string
  title: string
  message: string
  type?: 'info' | 'warning' | 'success' | 'error'
  is_read?: boolean
  created_at?: string | null
  created_by?: string
}

export function useNotifications(studentId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setNotifications((data || []) as Notification[])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar as notificações', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const addNotification = async (notificationData: Omit<Notification, 'id' | 'created_at'>) => {
    try {
      const targetId = studentId || user?.id
      const { error } = await supabase
        .from('notifications')
        .insert([{ 
          title: notificationData.title, 
          message: notificationData.message, 
          type: notificationData.type, 
          target_users: targetId ? [targetId] : [],
          created_by: user?.id
        }])
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Notificação enviada com sucesso' })
    } catch (error) {
      console.error('Error adding notification:', error)
      toast({ title: 'Erro', description: 'Não foi possível enviar a notificação', variant: 'destructive' })
      throw error
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      if (error) throw error
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.is_read)
      await Promise.all(unread.map((n) => markAsRead(n.id)))
      toast({ title: 'Sucesso', description: 'Todas as notificações foram marcadas como lidas' })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast({ title: 'Erro', description: 'Não foi possível marcar as notificações como lidas', variant: 'destructive' })
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Notificação excluída com sucesso' })
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast({ title: 'Erro', description: 'Não foi possível excluir a notificação', variant: 'destructive' })
      throw error
    }
  }

  useEffect(() => { fetchNotifications() }, [studentId, user?.id])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return { notifications, loading, unreadCount, addNotification, markAsRead, markAllAsRead, deleteNotification, refetch: fetchNotifications }
}
