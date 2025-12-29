import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface SystemHealthMetrics {
  isOnline: boolean
  lastChecked: Date | null
  consecutiveErrors: number
  averageResponseTime: number
  uptime: number
}

export function useAuthSystemHealth() {
  const [metrics, setMetrics] = useState<SystemHealthMetrics>({
    isOnline: true,
    lastChecked: null,
    consecutiveErrors: 0,
    averageResponseTime: 0,
    uptime: 100
  })

  const [isMonitoring, setIsMonitoring] = useState(true)

  const checkSystemHealth = async (): Promise<boolean> => {
    const startTime = Date.now()
    
    try {
      // Teste simples de conectividade
      const { error } = await supabase.auth.getSession()
      const responseTime = Date.now() - startTime
      
      if (error && error.message.includes('connection')) {
        throw new Error('Connection error')
      }

      // Sistema saudável - atualiza métricas positivas
      setMetrics(prev => ({
        isOnline: true,
        lastChecked: new Date(),
        consecutiveErrors: 0,
        averageResponseTime: Math.round((prev.averageResponseTime + responseTime) / 2),
        uptime: Math.min(100, prev.uptime + 0.1)
      }))

      console.log(`[AuthSystemHealth] Sistema OK - ${responseTime}ms`)
      return true
      
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      // Sistema com problemas - atualiza métricas negativas
      setMetrics(prev => ({
        isOnline: false,
        lastChecked: new Date(),
        consecutiveErrors: prev.consecutiveErrors + 1,
        averageResponseTime: Math.round((prev.averageResponseTime + responseTime) / 2),
        uptime: Math.max(0, prev.uptime - 5)
      }))

      console.error(`[AuthSystemHealth] Sistema com problemas - ${responseTime}ms:`, error)
      return false
    }
  }

  const startMonitoring = () => {
    setIsMonitoring(true)
    console.log('[AuthSystemHealth] Monitoramento iniciado')
  }

  const stopMonitoring = () => {
    setIsMonitoring(false)
    console.log('[AuthSystemHealth] Monitoramento pausado')
  }

  // Monitora sistema a cada 30 segundos quando ativo
  useEffect(() => {
    if (!isMonitoring) return

    // Verificação inicial
    checkSystemHealth()

    const interval = setInterval(async () => {
      await checkSystemHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [isMonitoring])

  // Monitora foco da janela para pausar/retomar monitoramento
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[AuthSystemHealth] Janela oculta - pausando monitoramento')
        setIsMonitoring(false)
      } else {
        console.log('[AuthSystemHealth] Janela ativa - retomando monitoramento')
        setIsMonitoring(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const getHealthStatus = (): 'healthy' | 'degraded' | 'unhealthy' => {
    if (!metrics.isOnline) return 'unhealthy'
    if (metrics.consecutiveErrors > 0 || metrics.uptime < 90) return 'degraded'
    return 'healthy'
  }

  const getHealthMessage = (): string => {
    const status = getHealthStatus()
    
    switch (status) {
      case 'healthy':
        return 'Sistema funcionando normalmente'
      case 'degraded':
        return 'Sistema com lentidão ou problemas intermitentes'
      case 'unhealthy':
        return 'Sistema temporariamente indisponível'
      default:
        return 'Status desconhecido'
    }
  }

  return {
    metrics,
    isMonitoring,
    healthStatus: getHealthStatus(),
    healthMessage: getHealthMessage(),
    startMonitoring,
    stopMonitoring,
    checkHealth: checkSystemHealth
  }
}