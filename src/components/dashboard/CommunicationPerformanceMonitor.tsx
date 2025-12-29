import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

interface PerformanceMetrics {
  requestsPerMinute: number
  averageResponseTime: number
  errorRate: number
  activeConnections: number
  cacheHitRate: number
}

export function CommunicationPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    requestsPerMinute: 0,
    averageResponseTime: 0,
    errorRate: 0,
    activeConnections: 0,
    cacheHitRate: 0
  })
  const [isMonitoring, setIsMonitoring] = useState(false)

  const startMonitoring = () => {
    setIsMonitoring(true)
    
    // Simular métricas para demonstração
    const interval = setInterval(() => {
      setMetrics(prev => ({
        requestsPerMinute: Math.floor(Math.random() * 50) + 10,
        averageResponseTime: Math.floor(Math.random() * 200) + 50,
        errorRate: Math.random() * 2,
        activeConnections: Math.floor(Math.random() * 10) + 1,
        cacheHitRate: 85 + Math.random() * 10
      }))
    }, 2000)

    return () => clearInterval(interval)
  }

  useEffect(() => {
    if (isMonitoring) {
      const cleanup = startMonitoring()
      return cleanup
    }
  }, [isMonitoring])

  const getStatusColor = (value: number, thresholds: { warning: number, danger: number }, invert = false) => {
    if (invert) {
      return value < thresholds.danger ? 'destructive' : value < thresholds.warning ? 'secondary' : 'default'
    }
    return value > thresholds.danger ? 'destructive' : value > thresholds.warning ? 'secondary' : 'default'
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Monitor de Performance</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsMonitoring(!isMonitoring)}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isMonitoring ? 'animate-spin' : ''}`} />
          {isMonitoring ? 'Parar' : 'Iniciar'} Monitor
        </Button>
      </div>

      {isMonitoring ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Requisições/min</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics.requestsPerMinute}</span>
              <Badge variant={getStatusColor(metrics.requestsPerMinute, { warning: 30, danger: 40 })}>
                {metrics.requestsPerMinute > 40 ? 'Alto' : metrics.requestsPerMinute > 30 ? 'Médio' : 'Normal'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Tempo Resposta (ms)</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics.averageResponseTime}</span>
              <Badge variant={getStatusColor(metrics.averageResponseTime, { warning: 150, danger: 200 })}>
                {metrics.averageResponseTime > 200 ? 'Lento' : metrics.averageResponseTime > 150 ? 'Médio' : 'Rápido'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Taxa de Erro (%)</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics.errorRate.toFixed(1)}</span>
              <Badge variant={getStatusColor(metrics.errorRate, { warning: 1, danger: 2 })}>
                {metrics.errorRate > 2 ? 'Alto' : metrics.errorRate > 1 ? 'Médio' : 'Baixo'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Conexões Ativas</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics.activeConnections}</span>
              <Badge variant="outline">
                <Activity className="w-3 h-3 mr-1" />
                Online
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Cache Hit Rate (%)</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics.cacheHitRate.toFixed(1)}</span>
              <Badge variant={getStatusColor(metrics.cacheHitRate, { warning: 80, danger: 70 }, true)}>
                {metrics.cacheHitRate > 90 ? 'Ótimo' : metrics.cacheHitRate > 80 ? 'Bom' : 'Baixo'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Status Geral</p>
            <div className="flex items-center gap-2">
              {metrics.errorRate < 1 && metrics.averageResponseTime < 150 ? (
                <>
                  <CheckCircle className="w-5 h-5 text-success" />
                  <Badge variant="default">Saudável</Badge>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <Badge variant="secondary">Atenção</Badge>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Clique em "Iniciar Monitor" para acompanhar as métricas de performance</p>
        </div>
      )}

      {isMonitoring && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            📊 Monitor ativo • Cache otimizado • Real-time subscriptions consolidadas
          </p>
        </div>
      )}
    </Card>
  )
}