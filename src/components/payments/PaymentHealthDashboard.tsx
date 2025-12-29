// FASE 5: DASHBOARD DE SAÚDE DO SISTEMA DE PAGAMENTOS
// Visão consolidada de todas as métricas e alertas do sistema
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { PaymentSystemStatusIndicator } from './PaymentSystemStatusIndicator';
import { PaymentValidationPanel } from './PaymentValidationPanel';
import { useUnifiedPaymentSystem } from '@/hooks/useUnifiedPaymentSystem';

export function PaymentHealthDashboard() {
  const {
    paymentStats,
    performanceStats,
    loading,
    error,
    smartRefresh
  } = useUnifiedPaymentSystem();

  const getHealthScore = () => {
    if (error) return 0;
    if (loading) return 50;

    let score = 100;

    // Penalize poor cache performance
    if (performanceStats.cacheHitRate < 50) score -= 20;
    if (performanceStats.cacheHitRate < 30) score -= 20;

    // Penalize stale data
    if (performanceStats.dataFreshness !== 'fresh') score -= 15;

    // Penalize high overdue rates
    const overdueRate = paymentStats.totalStudents > 0
      ? (paymentStats.overdueStudents / paymentStats.totalStudents) * 100
      : 0;

    if (overdueRate > 30) score -= 25;
    else if (overdueRate > 15) score -= 15;

    return Math.max(score, 0);
  };

  const healthScore = getHealthScore();
  const getHealthStatus = () => {
    if (healthScore >= 90) return { label: 'Excelente', color: 'default', icon: CheckCircle };
    if (healthScore >= 70) return { label: 'Bom', color: 'secondary', icon: CheckCircle };
    if (healthScore >= 50) return { label: 'Regular', color: 'outline', icon: AlertTriangle };
    return { label: 'Crítico', color: 'destructive', icon: AlertTriangle };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* System Overview */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Visão Geral do Sistema
            </span>
            <Badge variant={healthStatus.color as any} className="flex items-center gap-1">
              <HealthIcon className="h-3 w-3" />
              {healthStatus.label}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Health Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Pontuação de Saúde</span>
              <span className={`text-sm font-mono ${healthScore >= 90 ? 'text-green-600' : healthScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {healthScore}%
              </span>
            </div>
            <Progress value={healthScore} className="h-2" />
          </div>

          <Separator />

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Receita Total</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                R$ {paymentStats.totalRevenue.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Últimos 30 dias
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Alunos Ativos</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {paymentStats.paidStudents}
              </p>
              <p className="text-xs text-muted-foreground">
                de {paymentStats.totalStudents} total
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Performance</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {performanceStats.cacheHitRate}%
              </p>
              <p className="text-xs text-muted-foreground">
                Taxa de cache
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Em Atraso</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {paymentStats.overdueStudents}
              </p>
              <p className="text-xs text-muted-foreground">
                R$ {paymentStats.overdueAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => smartRefresh(true)}
              disabled={loading}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Dados
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right Column: Status and Validation */}
      <div className="space-y-6">
        {/* System Status Indicator */}
        <PaymentSystemStatusIndicator />

        {/* Validation Panel */}
        <PaymentValidationPanel />
      </div>
    </div>
  );
}