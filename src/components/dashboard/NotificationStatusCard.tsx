import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Smartphone, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface NotificationStats {
  totalStudents: number;
  withPlayerId: number;
  withPushToken: number;
  activeDevices: number;
  noDevices: number;
  byPlatform: {
    android: number;
    ios: number;
    web: number;
    unknown: number;
  };
}

export function NotificationStatusCard() {
  const [stats, setStats] = useState<NotificationStats>({
    totalStudents: 0,
    withPlayerId: 0,
    withPushToken: 0,
    activeDevices: 0,
    noDevices: 0,
    byPlatform: {
      android: 0,
      ios: 0,
      web: 0,
      unknown: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const { user } = useSupabaseAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Get all students for this teacher
        const { data: students } = await supabase
          .from('students')
          .select('user_id')
          .eq('teacher_id', user.id);

        if (!students || students.length === 0) {
          setStats({
            totalStudents: 0,
            withPlayerId: 0,
            withPushToken: 0,
            activeDevices: 0,
            noDevices: 0,
            byPlatform: { android: 0, ios: 0, web: 0, unknown: 0 }
          });
          return;
        }

        const studentIds = students.map(s => s.user_id);

        // Get profiles with push notification data
        const { data: profiles } = await supabase
          .from('profiles')
          .select('onesignal_player_id, push_token, platform')
          .in('id', studentIds);

        const withPlayerId = profiles?.filter(p => p.onesignal_player_id).length || 0;
        const withPushToken = profiles?.filter(p => p.push_token).length || 0;
        const activeDevices = profiles?.filter(p => p.onesignal_player_id || p.push_token).length || 0;
        const noDevices = (profiles?.length || 0) - activeDevices;

        // Breakdown por plataforma
        const byPlatform = {
          android: profiles?.filter(p => p.platform === 'android' && (p.onesignal_player_id || p.push_token)).length || 0,
          ios: profiles?.filter(p => p.platform === 'ios' && (p.onesignal_player_id || p.push_token)).length || 0,
          web: profiles?.filter(p => p.platform === 'web' && (p.onesignal_player_id || p.push_token)).length || 0,
          unknown: profiles?.filter(p => !p.platform && (p.onesignal_player_id || p.push_token)).length || 0
        };

        setStats({
          totalStudents: studentIds.length,
          withPlayerId,
          withPushToken,
          activeDevices,
          noDevices,
          byPlatform
        });
      } catch (error) {
        console.error('Error fetching notification stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando estatísticas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRate = stats.totalStudents > 0 
    ? Math.round((stats.activeDevices / stats.totalStudents) * 100) 
    : 0;

  const getStatusBadge = () => {
    if (stats.activeDevices === 0) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Nenhum dispositivo</Badge>;
    }
    if (successRate >= 80) {
      return <Badge variant="default" className="gap-1 bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3" /> Excelente</Badge>;
    }
    if (successRate >= 50) {
      return <Badge variant="default" className="gap-1 bg-warning text-warning-foreground"><AlertCircle className="h-3 w-3" /> Bom</Badge>;
    }
    return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Baixo</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle>Status de Notificações Push</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Visão geral dos dispositivos habilitados para receber notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-success/10 rounded-lg border border-success/20">
            <p className="text-3xl font-bold text-success">{stats.activeDevices}</p>
            <p className="text-xs text-muted-foreground mt-1">Dispositivos Ativos</p>
          </div>
          
          <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-3xl font-bold text-primary">{successRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Taxa de Cobertura</p>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold text-muted-foreground">{stats.totalStudents}</p>
            <p className="text-xs text-muted-foreground mt-1">Total de Alunos</p>
          </div>
        </div>

        {/* Platform Breakdown */}
        {stats.activeDevices > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Dispositivos por Plataforma:</p>
            <div className="flex flex-wrap gap-2">
              {stats.byPlatform.android > 0 && (
                <Badge variant="outline" className="gap-1">
                  📱 Android: {stats.byPlatform.android}
                </Badge>
              )}
              {stats.byPlatform.ios > 0 && (
                <Badge variant="outline" className="gap-1">
                  🍎 iOS: {stats.byPlatform.ios}
                </Badge>
              )}
              {stats.byPlatform.web > 0 && (
                <Badge variant="outline" className="gap-1">
                  🌐 Web: {stats.byPlatform.web}
                </Badge>
              )}
              {stats.byPlatform.unknown > 0 && (
                <Badge variant="outline" className="gap-1 border-warning/50 text-warning">
                  ❓ Desconhecido: {stats.byPlatform.unknown}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Alerts */}
        {stats.activeDevices === 0 && stats.totalStudents > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nenhum dispositivo ativo</AlertTitle>
            <AlertDescription>
              Seus alunos precisam abrir o App do Aluno e aceitar as notificações para receberem suas mensagens.
            </AlertDescription>
          </Alert>
        )}

        {stats.activeDevices > 0 && successRate < 50 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Taxa de ativação baixa</AlertTitle>
            <AlertDescription>
              Apenas {successRate}% dos seus alunos têm notificações ativadas. 
              Incentive-os a habilitar as notificações para melhor comunicação.
            </AlertDescription>
          </Alert>
        )}

        {successRate >= 80 && stats.totalStudents > 0 && (
          <Alert className="border-success bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Ótima cobertura!</AlertTitle>
            <AlertDescription>
              {successRate}% dos seus alunos estão prontos para receber notificações.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
