import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Bell, 
  BellOff,
  Loader2,
  Settings,
  Users,
  Send,
  Eye
} from 'lucide-react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { useAuthState } from '@/hooks/useAuthState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemCheck {
  name: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export function OneSignalSystemStatus() {
  const { 
    isInitialized, 
    playerId, 
    loading, 
    initError,
    requestPermission,
    getPlayerId,
    syncPlayerIdWithServer,
    checkSubscriptionStatus
  } = useOneSignal();
  
  const { user } = useAuthState();
  const [checks, setChecks] = useState<SystemCheck[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(false);

  const runSystemChecks = async () => {
    setIsRunningTests(true);
    const newChecks: SystemCheck[] = [];

    // 1. SDK Loading Check
    try {
      if (typeof window !== 'undefined' && window.OneSignal) {
        newChecks.push({
          name: 'OneSignal SDK',
          status: 'success',
          message: 'SDK carregado com sucesso'
        });
      } else {
        newChecks.push({
          name: 'OneSignal SDK',
          status: 'error',
          message: 'SDK não foi carregado',
          details: 'Verifique se o script está incluído no HTML'
        });
      }
    } catch (error) {
      newChecks.push({
        name: 'OneSignal SDK',
        status: 'error',
        message: 'Erro ao verificar SDK',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // 2. Initialization Check
    if (loading) {
      newChecks.push({
        name: 'Inicialização',
        status: 'pending',
        message: 'Inicializando...'
      });
    } else if (initError) {
      newChecks.push({
        name: 'Inicialização',
        status: 'error',
        message: 'Falha na inicialização',
        details: initError
      });
    } else if (isInitialized) {
      newChecks.push({
        name: 'Inicialização',
        status: 'success',
        message: 'OneSignal inicializado'
      });
    } else {
      newChecks.push({
        name: 'Inicialização',
        status: 'error',
        message: 'OneSignal não inicializado'
      });
    }

    // 3. Permission Check
    try {
      const hasPermission = await checkSubscriptionStatus();
      setSubscriptionStatus(hasPermission);
      
      if (hasPermission) {
        newChecks.push({
          name: 'Permissões',
          status: 'success',
          message: 'Permissões concedidas'
        });
      } else {
        newChecks.push({
          name: 'Permissões',
          status: 'warning',
          message: 'Permissões não concedidas',
          details: 'Clique em "Solicitar Permissão" para ativar'
        });
      }
    } catch (error) {
      newChecks.push({
        name: 'Permissões',
        status: 'error',
        message: 'Erro ao verificar permissões',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // 4. Player ID Check
    if (playerId) {
      newChecks.push({
        name: 'Player ID',
        status: 'success',
        message: 'Player ID capturado',
        details: `ID: ${playerId.substring(0, 8)}...`
      });
    } else {
      newChecks.push({
        name: 'Player ID',
        status: 'warning',
        message: 'Player ID não disponível',
        details: 'Necessário para envio de notificações'
      });
    }

    // 5. User Authentication Check
    if (user) {
      newChecks.push({
        name: 'Autenticação',
        status: 'success',
        message: 'Usuário autenticado',
        details: `ID: ${user.id.substring(0, 8)}...`
      });
    } else {
      newChecks.push({
        name: 'Autenticação',
        status: 'error',
        message: 'Usuário não autenticado'
      });
    }

    // 6. Database Sync Check
    if (user && playerId) {
      try {
        const result = await syncPlayerIdWithServer(playerId);
        if (result.success) {
          newChecks.push({
            name: 'Sincronização DB',
            status: 'success',
            message: 'Player ID sincronizado'
          });
        } else {
          newChecks.push({
            name: 'Sincronização DB',
            status: 'error',
            message: 'Falha na sincronização'
          });
        }
      } catch (error) {
        newChecks.push({
          name: 'Sincronização DB',
          status: 'error',
          message: 'Erro na sincronização',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      newChecks.push({
        name: 'Sincronização DB',
        status: 'warning',
        message: 'Aguardando Player ID e usuário'
      });
    }

    setChecks(newChecks);
    setIsRunningTests(false);
  };

  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission();
      if (result) {
        toast.success('Permissão concedida com sucesso!');
        // Tentar obter player ID após a permissão
        setTimeout(() => getPlayerId(), 1000);
        setTimeout(() => runSystemChecks(), 2000);
      } else {
        toast.error('Permissão negada pelo usuário');
      }
    } catch (error) {
      toast.error('Erro ao solicitar permissão');
    }
  };

  const sendTestNotification = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('onesignal-notifications', {
        body: {
          action: 'send_notification',
          title: 'Teste do Sistema',
          message: 'Esta é uma notificação de teste do sistema OneSignal',
          targetSegment: 'todos'
        }
      });

      if (error) {
        console.error('Test notification error:', error);
        toast.error(`Erro no teste: ${error.message}`);
      } else {
        console.log('Test notification result:', data);
        toast.success('Notificação de teste enviada!');
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      toast.error('Falha no envio do teste');
    }
  };

  const getStatusIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: SystemCheck['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">OK</Badge>;
      case 'error':
        return <Badge variant="destructive">ERRO</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">ATENÇÃO</Badge>;
      case 'pending':
        return <Badge variant="outline">VERIFICANDO</Badge>;
    }
  };

  // Executar verificações automaticamente
  useEffect(() => {
    if (!loading) {
      runSystemChecks();
    }
  }, [loading, isInitialized, playerId, user]);

  const successCount = checks.filter(c => c.status === 'success').length;
  const errorCount = checks.filter(c => c.status === 'error').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const totalChecks = checks.length;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Status do Sistema OneSignal
          </CardTitle>
          <Button
            onClick={runSystemChecks}
            disabled={isRunningTests}
            variant="outline"
            size="sm"
          >
            {isRunningTests ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </Button>
        </div>
        
        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className="text-green-600">
            ✓ {successCount} OK
          </Badge>
          {warningCount > 0 && (
            <Badge variant="outline" className="text-yellow-600">
              ⚠ {warningCount} Atenção
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="outline" className="text-red-600">
              ✗ {errorCount} Erro
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resumo Visual */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            {subscriptionStatus ? (
              <Bell className="h-4 w-4 text-green-500" />
            ) : (
              <BellOff className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">
              {subscriptionStatus ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              Player ID: {playerId ? 'OK' : 'N/A'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Eye className="h-4 w-4" />
            <span className="text-sm">
              SDK: {isInitialized ? 'OK' : 'Erro'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Send className="h-4 w-4" />
            <span className="text-sm">
              Sistema: {errorCount === 0 ? 'OK' : 'Erro'}
            </span>
          </div>
        </div>

        {/* Verificações Detalhadas */}
        <div className="space-y-3">
          {checks.map((check, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                {getStatusIcon(check.status)}
                <div>
                  <div className="font-medium">{check.name}</div>
                  <div className="text-sm text-muted-foreground">{check.message}</div>
                  {check.details && (
                    <div className="text-xs text-muted-foreground mt-1">{check.details}</div>
                  )}
                </div>
              </div>
              {getStatusBadge(check.status)}
            </div>
          ))}
        </div>

        {/* Ações Rápidas */}
        <div className="flex flex-wrap gap-2 pt-3 border-t">
          <Button
            onClick={handleRequestPermission}
            disabled={subscriptionStatus || loading}
            variant="outline"
            size="sm"
          >
            <Bell className="h-4 w-4 mr-2" />
            Solicitar Permissão
          </Button>
          
          <Button
            onClick={sendTestNotification}
            disabled={!user || !isInitialized}
            variant="outline"
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            Teste de Notificação
          </Button>
          
          <Button
            onClick={() => getPlayerId()}
            disabled={!isInitialized}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Player ID
          </Button>
        </div>

        {/* Alertas */}
        {errorCount > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorCount} erro(s) detectado(s). O sistema de notificações pode não funcionar corretamente.
            </AlertDescription>
          </Alert>
        )}

        {warningCount > 0 && errorCount === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {warningCount} item(ns) precisa(m) de atenção para funcionamento completo.
            </AlertDescription>
          </Alert>
        )}

        {successCount === totalChecks && totalChecks > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✅ Sistema OneSignal funcionando perfeitamente!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}