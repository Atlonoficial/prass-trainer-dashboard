import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Database, Wifi, Zap, RefreshCw } from 'lucide-react';
import { useRealtime } from '@/providers/RealtimeProvider';
import { logAllCacheStats } from '@/utils/cacheManager';
import { getPendingWorkouts } from '@/services/workoutSyncService';
import { useAuth } from '@/hooks/useAuth';

export function SystemHealthMonitor() {
  const { isConnected, lastActivity } = useRealtime();
  const { user } = useAuth();
  const [pendingWorkouts, setPendingWorkouts] = useState(0);
  const [loading, setLoading] = useState(false);

  const checkPendingWorkouts = async () => {
    setLoading(true);
    try {
      const pending = await getPendingWorkouts();
      setPendingWorkouts(pending.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkPendingWorkouts();
    }
  }, [user]);

  const getConnectionStatus = () => {
    if (!isConnected) return { label: 'Desconectado', color: 'destructive' };
    
    if (lastActivity) {
      const diff = Date.now() - lastActivity.getTime();
      if (diff > 60000) return { label: 'Inativo', color: 'warning' };
    }
    
    return { label: 'Conectado', color: 'success' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Status do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Real-time Connection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            <span className="text-sm">Real-time</span>
          </div>
          <Badge variant={connectionStatus.color as any}>
            {connectionStatus.label}
          </Badge>
        </div>

        {lastActivity && (
          <div className="text-xs text-muted-foreground">
            Última atividade: {lastActivity.toLocaleTimeString('pt-BR')}
          </div>
        )}

        {/* Sync Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Workouts pendentes de sync</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={pendingWorkouts > 0 ? 'warning' : 'success'}>
              {loading ? '...' : pendingWorkouts}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={checkPendingWorkouts}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Cache Stats */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => logAllCacheStats()}
            className="w-full"
          >
            <Database className="w-4 h-4 mr-2" />
            Ver Estatísticas de Cache (Console)
          </Button>
        </div>

        {/* System Info */}
        <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
          <div>✅ Fase 1: Sistema de exclusões otimizado</div>
          <div>✅ Fase 2: Real-time centralizado + Cache inteligente</div>
          <div>✅ Fase 3: Monitoramento e validação</div>
        </div>
      </CardContent>
    </Card>
  );
}
