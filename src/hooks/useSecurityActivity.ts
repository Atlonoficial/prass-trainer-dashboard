import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface SecurityActivity {
  id: string
  activity_type: string
  activity_description: string
  ip_address: string | null
  user_agent: string | null
  device_info: Record<string, any>
  location_info: Record<string, any>
  success: boolean
  created_at: string
}

export function useSecurityActivity() {
  const [activities, setActivities] = useState<SecurityActivity[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchActivities = async (limit = 50) => {
    if (!user) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('security_activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const transformedActivities: SecurityActivity[] = data?.map(activity => ({
        ...activity,
        device_info: (activity.device_info as any) || {},
        location_info: (activity.location_info as any) || {}
      })) || []
      
      setActivities(transformedActivities)
    } catch (error: any) {
      console.error('Error fetching security activities:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico de atividades',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const logActivity = async (
    activityType: string,
    description: string,
    success = true,
    additionalInfo?: Record<string, any>
  ) => {
    if (!user) return

    try {
      const deviceInfo = {
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                navigator.userAgent.includes('Safari') ? 'Safari' : 'Outro',
        os: navigator.platform.includes('Win') ? 'Windows' : 
            navigator.platform.includes('Mac') ? 'macOS' : 
            navigator.platform.includes('Linux') ? 'Linux' : 'Outro',
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        ...additionalInfo
      }

      await supabase.rpc('log_security_activity', {
        p_user_id: user.id,
        p_activity_type: activityType,
        p_activity_description: description,
        p_ip_address: null, // Will be set by backend if needed
        p_user_agent: navigator.userAgent,
        p_device_info: deviceInfo,
        p_success: success
      })

      // Refresh activities after logging
      await fetchActivities()
    } catch (error) {
      console.error('Error logging security activity:', error)
    }
  }

  const getActivityIcon = (activityType: string) => {
    const iconMap: Record<string, string> = {
      'login': '🔐',
      'logout': '🚪',
      'password_change': '🔑',
      '2fa_enabled': '🛡️',
      '2fa_disabled': '⚠️',
      'session_revoked': '❌',
      'all_sessions_revoked': '🚫',
      'backup_codes_regenerated': '🔄',
      'profile_updated': '👤',
      'settings_changed': '⚙️',
      'suspicious_login': '🚨',
      'failed_login': '❌'
    }
    return iconMap[activityType] || '📝'
  }

  const getActivityColor = (activityType: string, success: boolean) => {
    if (!success) return 'text-destructive'
    
    const colorMap: Record<string, string> = {
      'login': 'text-green-600',
      'logout': 'text-blue-600',
      'password_change': 'text-yellow-600',
      '2fa_enabled': 'text-green-600',
      '2fa_disabled': 'text-orange-600',
      'session_revoked': 'text-red-600',
      'all_sessions_revoked': 'text-red-600',
      'backup_codes_regenerated': 'text-blue-600',
      'suspicious_login': 'text-red-600',
      'failed_login': 'text-red-600'
    }
    return colorMap[activityType] || 'text-muted-foreground'
  }

  const clearOldActivities = async (daysToKeep = 90) => {
    if (!user) return false

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const { error } = await supabase
        .from('security_activity_log')
        .delete()
        .eq('user_id', user.id)
        .lt('created_at', cutoffDate.toISOString())

      if (error) throw error

      await fetchActivities()

      toast({
        title: 'Sucesso',
        description: `Atividades antigas (${daysToKeep}+ dias) foram removidas`
      })

      return true
    } catch (error: any) {
      console.error('Error clearing old activities:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível limpar as atividades antigas',
        variant: 'destructive'
      })
      return false
    }
  }

  useEffect(() => {
    if (user) {
      fetchActivities()
    }
  }, [user])

  return {
    activities,
    loading,
    logActivity,
    getActivityIcon,
    getActivityColor,
    clearOldActivities,
    refreshActivities: fetchActivities
  }
}