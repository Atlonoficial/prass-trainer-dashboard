import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

interface AppNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'payment_success' | 'access_granted' | 'expiration_warning' | 'general'
  is_read: boolean
  metadata?: Record<string, any>
  created_at: string
}

export function useNotificationSystem() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, type, is_read, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const mappedData: AppNotification[] = (data || []).map(item => ({
        id: item.id,
        user_id: user.id,
        title: item.title,
        message: item.message,
        type: (item.type || 'general') as AppNotification['type'],
        is_read: item.is_read || false,
        metadata: {},
        created_at: item.created_at
      }))

      setNotifications(mappedData)
      setUnreadCount(mappedData.filter(n => !n.is_read).length)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [user?.id])

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [user?.id])

  const createNotification = useCallback(async (
    targetUserId: string,
    title: string,
    message: string,
    type: AppNotification['type'] = 'general',
    metadata?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          created_by: targetUserId,
          title,
          message,
          type
        })

      if (error) throw error
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }, [])

  const showToastNotification = useCallback((notification: AppNotification) => {
    const icons = {
      payment_success: '💳',
      access_granted: '🔓',
      expiration_warning: '⚠️',
      general: '📢'
    }

    toast({
      title: `${icons[notification.type]} ${notification.title}`,
      description: notification.message,
      duration: notification.type === 'payment_success' ? 5000 : 3000,
    })
  }, [toast])

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `created_by=eq.${user.id}`
        },
        (payload) => {
          const newData = payload.new as any
          const newNotification: AppNotification = {
            id: newData.id,
            user_id: user.id,
            title: newData.title,
            message: newData.message,
            type: newData.type || 'general',
            is_read: false,
            metadata: {},
            created_at: newData.created_at
          }
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
          showToastNotification(newNotification)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, showToastNotification])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
  }
}