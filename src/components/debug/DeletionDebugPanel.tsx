import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { testDeletionSystem } from '@/services/safeDeletionService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * FASE 1 - SISTEMA DE DEBUG AVANÇADO
 * 
 * Painel de debug para monitorar exclusões e capturar erros em tempo real
 * Permite rastrear exatamente onde/quando os problemas ocorrem
 */

interface DebugLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  operation: string;
  message: string;
  details?: any;
}

export const DeletionDebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'unknown' | 'healthy' | 'error'>('unknown');

  // Função para adicionar log
  const addLog = (type: DebugLog['type'], operation: string, message: string, details?: any) => {
    const log: DebugLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      operation,
      message,
      details
    };
    
    setLogs(prev => [log, ...prev.slice(0, 49)]); // Manter apenas os últimos 50 logs
  };

  // Interceptar console.log para capturar logs de exclusão
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.log = (...args) => {
      originalConsoleLog(...args);
      
      const message = args.join(' ');
      
      // Capturar logs específicos de exclusão
      if (message.includes('[SAFE_DELETE]') || message.includes('[DELETE_')) {
        let type: DebugLog['type'] = 'info';
        let operation = 'deletion';
        
        if (message.includes('✅') || message.includes('🎉')) {
          type = 'success';
        } else if (message.includes('❌')) {
          type = 'error';
        } else if (message.includes('⚠️')) {
          type = 'warning';
        }
        
        if (message.includes('NUTRITION') || message.includes('DIET')) {
          operation = 'diet_deletion';
        } else if (message.includes('WORKOUT') || message.includes('TRAINING')) {
          operation = 'training_deletion';
        }
        
        addLog(type, operation, message, args.length > 1 ? args.slice(1) : undefined);
      }
    };

    console.error = (...args) => {
      originalConsoleError(...args);
      
      const message = args.join(' ');
      if (message.includes('[SAFE_DELETE]') || message.includes('[DELETE_')) {
        addLog('error', 'deletion_error', message, args.length > 1 ? args.slice(1) : undefined);
      }
    };

    console.warn = (...args) => {
      originalConsoleWarn(...args);
      
      const message = args.join(' ');
      if (message.includes('[SAFE_DELETE]') || message.includes('[DELETE_')) {
        addLog('warning', 'deletion_warning', message, args.length > 1 ? args.slice(1) : undefined);
      }
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  // Testar sistema de exclusão
  const handleTestSystem = async () => {
    addLog('info', 'system_test', 'Iniciando teste do sistema de exclusão...');
    
    try {
      await testDeletionSystem();
      setSystemStatus('healthy');
      addLog('success', 'system_test', 'Sistema de exclusão funcionando corretamente');
    } catch (error) {
      setSystemStatus('error');
      addLog('error', 'system_test', 'Erro no teste do sistema', error);
    }
  };

  // Testar conectividade com Supabase
  const handleTestConnection = async () => {
    addLog('info', 'connection_test', 'Testando conectividade com Supabase...');
    
    try {
      const { data, error } = await supabase.from('workouts').select('count').limit(1);
      
      if (error) {
        addLog('error', 'connection_test', 'Erro de conectividade', error);
        setSystemStatus('error');
      } else {
        addLog('success', 'connection_test', 'Conectividade OK');
        setSystemStatus('healthy');
      }
    } catch (error) {
      addLog('error', 'connection_test', 'Erro inesperado na conectividade', error);
      setSystemStatus('error');
    }
  };

  // Testar RLS policies
  const handleTestRLS = async () => {
    addLog('info', 'rls_test', 'Testando RLS policies...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        addLog('warning', 'rls_test', 'Usuário não autenticado para teste de RLS');
        return;
      }

      // Testar acesso às tabelas
      const [nutritionTest, workoutTest] = await Promise.all([
        supabase.from('meal_plans').select('id').limit(1),
        supabase.from('workouts').select('id').limit(1)
      ]);

      if (nutritionTest.error) {
        addLog('error', 'rls_test', 'Erro no acesso a meal_plans', nutritionTest.error);
      } else {
        addLog('success', 'rls_test', 'Acesso a meal_plans OK');
      }

      if (workoutTest.error) {
        addLog('error', 'rls_test', 'Erro no acesso a workouts', workoutTest.error);
      } else {
        addLog('success', 'rls_test', 'Acesso a workouts OK');
      }

    } catch (error) {
      addLog('error', 'rls_test', 'Erro inesperado no teste de RLS', error);
    }
  };

  // Limpar logs
  const handleClearLogs = () => {
    setLogs([]);
    addLog('info', 'system', 'Logs limpos');
  };

  // Cores para diferentes tipos de log
  const getLogColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  const getLogBadgeVariant = (type: DebugLog['type']) => {
    switch (type) {
      case 'success': return 'default';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔧 Debug Panel - Sistema de Exclusão</span>
          <div className="flex items-center gap-2">
            <Badge variant={systemStatus === 'healthy' ? 'default' : systemStatus === 'error' ? 'destructive' : 'secondary'}>
              {systemStatus === 'healthy' ? '✅ Sistema OK' : systemStatus === 'error' ? '❌ Sistema com Erro' : '⚪ Status Desconhecido'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controles */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleTestSystem} variant="outline" size="sm">
            🧪 Testar Sistema
          </Button>
          <Button onClick={handleTestConnection} variant="outline" size="sm">
            🔗 Testar Conexão
          </Button>
          <Button onClick={handleTestRLS} variant="outline" size="sm">
            🛡️ Testar RLS
          </Button>
          <Button onClick={handleClearLogs} variant="outline" size="sm">
            🧹 Limpar Logs
          </Button>
        </div>

        <Separator />

        {/* Estatísticas */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-green-600">{logs.filter(l => l.type === 'success').length}</div>
            <div className="text-muted-foreground">Sucessos</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-red-600">{logs.filter(l => l.type === 'error').length}</div>
            <div className="text-muted-foreground">Erros</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-yellow-600">{logs.filter(l => l.type === 'warning').length}</div>
            <div className="text-muted-foreground">Avisos</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-600">{logs.filter(l => l.type === 'info').length}</div>
            <div className="text-muted-foreground">Infos</div>
          </div>
        </div>

        <Separator />

        {/* Logs */}
        <div>
          <h4 className="font-semibold mb-2">Logs em Tempo Real ({logs.length}/50)</h4>
          <ScrollArea className="h-[300px] border rounded p-2">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum log capturado ainda. Execute uma exclusão para ver os logs.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="border-l-2 border-l-muted pl-3 py-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant={getLogBadgeVariant(log.type)} className="text-xs">
                        {log.type.toUpperCase()}
                      </Badge>
                      <span className="text-muted-foreground">{log.timestamp}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-mono">{log.operation}</span>
                    </div>
                    <div className={`text-sm mt-1 ${getLogColor(log.type)}`}>
                      {log.message}
                    </div>
                    {log.details && (
                      <details className="mt-1">
                        <summary className="text-xs text-muted-foreground cursor-pointer">
                          Ver detalhes
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Instruções */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
          <strong>FASE 1 - Sistema de Debug Avançado:</strong><br />
          • Este painel monitora todas as operações de exclusão em tempo real<br />
          • Logs são capturados automaticamente dos serviços de exclusão<br />
          • Use os botões de teste para verificar o status do sistema<br />
          • Monitore os logs durante exclusões para identificar problemas
        </div>
      </CardContent>
    </Card>
  );
};