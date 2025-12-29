// FASE 5: INDICADOR DE STATUS DO SISTEMA DE PAGAMENTOS
// Component para mostrar saúde e performance do sistema em tempo real
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, Clock, Database, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import { useUnifiedPaymentSystem } from '@/hooks/useUnifiedPaymentSystem';

interface PaymentSystemStatusIndicatorProps {
  className?: string;
  compact?: boolean;
}

export function PaymentSystemStatusIndicator({
  className = "",
  compact = false
}: PaymentSystemStatusIndicatorProps) {
  const { performanceStats, loading, error, paymentStats } = useUnifiedPaymentSystem();

  const getHealthStatus = () => {
    if (error) return { status: 'error', color: 'destructive', label: 'Erro' };
    if (loading) return { status: 'loading', color: 'secondary', label: 'Carregando' };

    const cacheHitRate = performanceStats.cacheHitRate;
    const dataFreshness = performanceStats.dataFreshness;

    if (cacheHitRate >= 80 && dataFreshness === 'fresh') {
      return { status: 'excellent', color: 'default', label: 'Excelente' };
    } else if (cacheHitRate >= 60 && dataFreshness === 'fresh') {
      return { status: 'good', color: 'secondary', label: 'Bom' };
    } else if (cacheHitRate >= 40) {
      return { status: 'fair', color: 'outline', label: 'Regular' };
    } else {
      return { status: 'poor', color: 'destructive', label: 'Lento' };
    }
  };

  const health = getHealthStatus();
  const lastRefreshAgo = performanceStats.lastRefresh ?
    Math.floor((Date.now() - performanceStats.lastRefresh) / 1000) : 0;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className={`flex items-center gap-2 ${className}`}>
              <Badge variant={health.color as any} className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                {health.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {performanceStats.cacheHitRate}% cache
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm space-y-1">
              <div>Status do Sistema: <strong>{health.label}</strong></div>
              <div>Eficiência do Cache: <strong>{performanceStats.cacheHitRate}%</strong></div>
              <div>Última atualização: <strong>{lastRefreshAgo}s atrás</strong></div>
              <div>Total de receita: <strong>R$ {paymentStats.totalRevenue.toFixed(2)}</strong></div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Sistema de Pagamentos
          <Badge variant={health.color as any} className="ml-auto">
            {health.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Eficiência do Cache
              </span>
              <span className="font-mono">{performanceStats.cacheHitRate}%</span>
            </div>
            <Progress value={performanceStats.cacheHitRate} className="h-1" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Tempo Médio
              </span>
              <span className="font-mono">{performanceStats.avgLoadTime}ms</span>
            </div>
            <Progress value={Math.min(performanceStats.avgLoadTime / 20, 100)} className="h-1" />
          </div>
        </div>

        {/* Data Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Dados em Cache
            </span>
            <Badge variant="outline" className="text-xs">
              {performanceStats.dataFreshness === 'fresh' ? '🟢 Atual' : '🟡 Desatualizado'}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-mono">{performanceStats.cachedRecords.students}</span> alunos
            </div>
            <div>
              <span className="font-mono">{performanceStats.cachedRecords.transactions}</span> transações
            </div>
            <div>
              <span className="font-mono">{performanceStats.cachedRecords.plans}</span> planos
            </div>
          </div>
        </div>

        {/* Real-time Stats */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>R$ {paymentStats.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3 w-3 text-blue-500" />
              <span>{lastRefreshAgo}s atrás</span>
            </div>
          </div>
        </div>

        {/* System Warnings */}
        {(error || performanceStats.cacheHitRate < 50) && (
          <div className="pt-2 border-t">
            <div className="text-xs text-destructive space-y-1">
              {error && <div>⚠️ {error}</div>}
              {performanceStats.cacheHitRate < 50 && (
                <div>⚡ Performance baixa detectada</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}