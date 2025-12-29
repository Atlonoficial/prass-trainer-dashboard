import React, { useState, useEffect } from 'react'
import { Bell, BellOff, X, Check, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  data?: any
  is_read: boolean
  created_at: string
  read_at?: string
}

export function StudentNotificationPanel() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)

  // Buscar notificações do aluno
  const fetchNotifications = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .contains('target_users', [user.id])
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Real-time subscriptions para notificações
  useEffect(() => {
    if (!user?.id) return

    fetchNotifications()

    const channel = supabase
      .channel('student-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `target_users.cs.{${user.id}}`
        },
        (payload) => {
          console.log('📱 New notification received:', payload.new)
          setNotifications(prev => [payload.new as Notification, ...prev])
          
          // Mostrar toast para nova notificação
          toast({
            title: (payload.new as Notification).title,
            description: (payload.new as Notification).message,
            duration: 5000,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, toast])

  // Marcar notificação como lida
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    if (!user?.id) return

    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .in('id', unreadIds)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )

      toast({
        title: "Notificações marcadas como lidas",
        description: `${unreadIds.length} notificações foram marcadas como lidas.`,
      })
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}d`
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment':
      case 'appointment_cancelled':
        return <Calendar className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  return (
    <div className="relative">
      {/* Botão de notificações */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setShowPanel(!showPanel)}
      >
        {unreadCount > 0 ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Painel de notificações */}
      {showPanel && (
        <Card className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-hidden shadow-lg z-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Notificações {unreadCount > 0 && `(${unreadCount})`}
            </CardTitle>
            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marcar todas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Carregando notificações...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div
                      className={`p-3 cursor-pointer hover:bg-muted/50 ${
                        !notification.is_read ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.created_at)}
                            </span>
                            {!notification.is_read && (
                              <div className="h-2 w-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < notifications.length - 1 && (
                      <Separator className="mx-3" />
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}