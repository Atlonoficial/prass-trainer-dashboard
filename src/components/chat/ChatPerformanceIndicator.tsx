import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Activity, Zap, Database, Clock } from 'lucide-react'

interface ChatPerformanceIndicatorProps {
  isLoading?: boolean
  isCached?: boolean
  requestsCount?: number
  responseTime?: number
  className?: string
}

export function ChatPerformanceIndicator({ 
  isLoading = false,
  isCached = false, 
  requestsCount = 0,
  responseTime = 0,
  className = '' 
}: ChatPerformanceIndicatorProps) {
  const getPerformanceStatus = () => {
    if (requestsCount > 10) return { color: 'destructive', text: 'Alto Tráfego', icon: Activity }
    if (responseTime > 1000) return { color: 'secondary', text: 'Lento', icon: Clock }
    if (isCached) return { color: 'default', text: 'Cacheado', icon: Database }
    return { color: 'outline', text: 'Otimizado', icon: Zap }
  }

  const status = getPerformanceStatus()
  const StatusIcon = status.icon

  if (isLoading) {
    return (
      <Badge variant="outline" className={`text-xs ${className}`}>
        <Activity className="w-3 h-3 mr-1 animate-spin" />
        Carregando...
      </Badge>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant={status.color as any} className={`text-xs ${className}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p><strong>Performance:</strong> {status.text}</p>
            {requestsCount > 0 && <p><strong>Requests:</strong> {requestsCount}/min</p>}
            {responseTime > 0 && <p><strong>Tempo:</strong> {responseTime}ms</p>}
            {isCached && <p><strong>Cache:</strong> Dados reutilizados</p>}
            <p className="text-muted-foreground">Sistema otimizado ativo</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}