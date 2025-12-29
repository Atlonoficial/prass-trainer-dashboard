import React, { useState, useEffect } from 'react'
import { Bell, X, Check, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

interface InAppNotification {
  id: string
  title: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  read: boolean
  created_at: string
  action_url?: string
  action_text?: string
}

export function InAppNotificationSystem() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user } = useSupabaseAuth()

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (user) {
      fetchNotifications()
      setupRealtimeSubscription()
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Simulação de notificações in-app (em produção, viria do Supabase)
      const mockNotifications: InAppNotification[] = [
        {
          id: '1',
          title: 'Bem-vindo!',
          message: 'Sistema de notificações configurado com sucesso.',
          type: 'success',
          read: false,
          created_at: new Date().toISOString()
        },
        {
          id: '2', 
          title: 'Treino Disponível',
          message: 'Novo treino foi adicionado ao seu plano.',
          type: 'info',
          read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          action_url: '/training',
          action_text: 'Ver Treino'
        }
      ]

      setNotifications(mockNotifications)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!user) return

    // Setup realtime subscription para novas notificações
    const channel = supabase
      .channel('in-app-notifications')
      .on('broadcast', { event: 'new_notification' }, (payload) => {
        console.log('New notification received:', payload)
        const newNotification = payload.payload as InAppNotification
        setNotifications(prev => [newNotification, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
  }

  const markAllAsRead = async () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    )
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="h-4 w-4 text-green-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default: return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}min`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`
    return `${Math.floor(diffMins / 1440)}d`
  }

  if (!user) return null

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-md shadow-lg z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notificações</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Marcar todas como lidas
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
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={cn(
                    "border-0 border-b rounded-none cursor-pointer hover:bg-muted/50",
                    !notification.read && "bg-muted/30"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm truncate">
                            {notification.title}
                          </h4>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.action_url && notification.action_text && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs mt-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = notification.action_url!
                            }}
                          >
                            {notification.action_text}
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeNotification(notification.id)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}