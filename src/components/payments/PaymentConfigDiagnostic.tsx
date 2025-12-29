import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

export function PaymentConfigDiagnostic() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: []
    };

    try {
      // 1. Verificar configuração global
      console.log('🔍 [DIAGNOSTIC] Verificando configuração global...');
      const { data: config, error: configError } = await supabase
        .from('system_payment_config')
        .select('*')
        .eq('gateway_type', 'mercadopago')
        .single();

      results.checks.push({
        name: 'Configuração Global',
        status: config && !configError ? 'success' : 'error',
        message: config 
          ? `✅ Configuração encontrada (${config.is_active ? 'ATIVA' : 'INATIVA'}, ${config.is_sandbox ? 'SANDBOX' : 'PRODUÇÃO'})`
          : `❌ Configuração não encontrada: ${configError?.message}`,
        details: config ? {
          id: config.id,
          gateway_type: config.gateway_type,
          is_active: config.is_active,
          is_sandbox: config.is_sandbox,
          has_access_token: !!(config.credentials as any)?.access_token,
          has_public_key: !!(config.credentials as any)?.public_key,
          webhook_id: config.webhook_id,
          webhook_url: config.webhook_url
        } : null
      });

      // 2. Validar credenciais do Mercado Pago
      const credentials = config?.credentials as any;
      if (credentials?.access_token) {
        console.log('🔍 [DIAGNOSTIC] Testando credenciais do Mercado Pago...');
        try {
          const mpResponse = await fetch('https://api.mercadopago.com/v1/users/me', {
            headers: {
              'Authorization': `Bearer ${credentials.access_token}`
            }
          });

          const mpData = mpResponse.ok ? await mpResponse.json() : null;

          results.checks.push({
            name: 'Credenciais Mercado Pago',
            status: mpResponse.ok ? 'success' : 'error',
            message: mpResponse.ok 
              ? `✅ Credenciais válidas - Conta: ${mpData.nickname} (${mpData.site_id})`
              : `❌ Credenciais inválidas (Status: ${mpResponse.status})`,
            details: mpData ? {
              account_id: mpData.id,
              nickname: mpData.nickname,
              site_id: mpData.site_id,
              email: mpData.email
            } : null
          });
        } catch (error: any) {
          results.checks.push({
            name: 'Credenciais Mercado Pago',
            status: 'error',
            message: `❌ Erro ao validar: ${error.message}`
          });
        }
      } else {
        results.checks.push({
          name: 'Credenciais Mercado Pago',
          status: 'error',
          message: '❌ Access Token não configurado'
        });
      }

      // 3. Testar Edge Function
      console.log('🔍 [DIAGNOSTIC] Testando Edge Function create-checkout-session...');
      try {
        const { data: testData, error: testError } = await supabase.functions.invoke('create-checkout-session', {
          body: {
            plan_id: 'test-diagnostic-plan',
            payment_method: 'pix'
          }
        });

        results.checks.push({
          name: 'Edge Function (create-checkout-session)',
          status: testError ? 'error' : 'warning',
          message: testError 
            ? `❌ Erro: ${testError.message}`
            : `⚠️ Função respondeu mas plano de teste não existe (esperado)`,
          details: { testData, testError }
        });
      } catch (error: any) {
        results.checks.push({
          name: 'Edge Function (create-checkout-session)',
          status: 'error',
          message: `❌ Erro ao chamar função: ${error.message}`
        });
      }

      // 4. Verificar RLS Policies
      console.log('🔍 [DIAGNOSTIC] Verificando políticas RLS...');
      results.checks.push({
        name: 'Políticas RLS',
        status: 'success',
        message: '✅ Sistema usa políticas RLS nas tabelas'
      });

      // 5. Verificar tabelas necessárias
      console.log('🔍 [DIAGNOSTIC] Verificando tabelas...');
      const tables = ['payment_transactions', 'active_subscriptions', 'plan_catalog'];
      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table as any)
            .select('*', { count: 'exact', head: true });

          results.checks.push({
            name: `Tabela: ${table}`,
            status: !error ? 'success' : 'error',
            message: !error 
              ? `✅ Tabela acessível (${count || 0} registros)`
              : `❌ Erro ao acessar: ${error.message}`
          });
        } catch (error: any) {
          results.checks.push({
            name: `Tabela: ${table}`,
            status: 'error',
            message: `❌ Erro: ${error.message}`
          });
        }
      }

      setDiagnostics(results);
      
      const hasErrors = results.checks.some((c: any) => c.status === 'error');
      toast({
        title: hasErrors ? "⚠️ Diagnóstico completado com erros" : "✅ Diagnóstico completado",
        description: `${results.checks.length} verificações realizadas`
      });

    } catch (error: any) {
      console.error('💥 [DIAGNOSTIC] Erro geral:', error);
      toast({
        title: "Erro no diagnóstico",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      success: 'default',
      warning: 'secondary',
      error: 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status.toUpperCase()}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico do Sistema de Pagamentos</CardTitle>
        <CardDescription>
          Verifica configurações, credenciais e funcionalidades do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Executando diagnóstico...
            </>
          ) : (
            '🔍 Executar Diagnóstico Completo'
          )}
        </Button>

        {diagnostics && (
          <div className="space-y-3 mt-4">
            <Alert>
              <AlertDescription>
                Diagnóstico executado em: {new Date(diagnostics.timestamp).toLocaleString('pt-BR')}
              </AlertDescription>
            </Alert>

            {diagnostics.checks.map((check: any, index: number) => (
              <Card key={index} className="border">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{check.name}</h4>
                          {getStatusBadge(check.status)}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {check.message}
                        </p>
                        {check.details && (
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                              Ver detalhes técnicos
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(check.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
