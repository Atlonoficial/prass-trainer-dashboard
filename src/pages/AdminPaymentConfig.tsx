import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertCircle, CheckCircle2, Loader2, Settings, Webhook, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useNavigate } from 'react-router-dom';

export default function AdminPaymentConfig() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userId, userRole, user } = useUnifiedAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingCredentials, setTestingCredentials] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState(false);
  const [config, setConfig] = useState({
    access_token: '',
    public_key: '',
    client_id: '',
    client_secret: '',
    is_active: false,
    is_sandbox: false // Produção por padrão
  });
  const [stats, setStats] = useState({
    totalTransactions: 0,
    activeTeachers: 0
  });

  // Verificação de acesso interna
  useEffect(() => {
    console.log('🔧 AdminPaymentConfig: Component mounted');
    console.log('👤 Current user:', { userId, userRole, email: user?.email });
    
    // Verificar se tem permissão
    const allowedRoles = ['teacher', 'admin'];
    const hasPermission = userRole && allowedRoles.includes(userRole);
    
    console.log('🔐 Access check:', { 
      userRole, 
      allowedRoles, 
      hasPermission,
      normalized: userRole === 'professor' ? 'teacher' : userRole
    });
    
    setHasAccess(hasPermission);
    
    if (hasPermission) {
      loadConfig();
      loadStats();
    }
  }, [userId, userRole, user]);

  const loadConfig = async () => {
    try {
      console.log('📡 AdminPaymentConfig: Loading config...');
      
      const { data, error } = await supabase
        .from('system_payment_config')
        .select('*')
        .eq('gateway_type', 'mercadopago')
        .single();

      console.log('📦 AdminPaymentConfig: Config result', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ AdminPaymentConfig: Error loading config:', error);
        toast({
          title: "Erro ao Carregar Configuração",
          description: `Erro: ${error.message}. Código: ${error.code}`,
          variant: "destructive"
        });
        return;
      }

      if (data) {
        const credentials = data.credentials as any;
        setConfig({
          access_token: credentials?.access_token || '',
          public_key: credentials?.public_key || '',
          client_id: credentials?.client_id || '',
          client_secret: credentials?.client_secret || '',
          is_active: data.is_active,
          is_sandbox: data.is_sandbox
        });
      }
    } catch (error: any) {
      console.error('Error loading config:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { count: transactionCount } = await supabase
        .from('payment_transactions')
        .select('*', { count: 'exact', head: true });

      const { data: teachers } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'teacher');

      setStats({
        totalTransactions: transactionCount || 0,
        activeTeachers: teachers?.length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const testCredentials = async () => {
    if (!config.access_token) {
      toast({
        title: "Erro",
        description: "Access Token é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setTestingCredentials(true);
    try {
      const response = await fetch('https://api.mercadopago.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${config.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "✅ Credenciais Válidas",
          description: `Conta: ${data.nickname} (${data.site_id})`,
        });
      } else {
        throw new Error('Credenciais inválidas');
      }
    } catch (error: any) {
      toast({
        title: "❌ Erro ao validar",
        description: error.message || "Credenciais inválidas",
        variant: "destructive"
      });
    } finally {
      setTestingCredentials(false);
    }
  };

  const configureWebhook = async () => {
    setConfiguringWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke('configure-mercadopago-webhook');

      if (error) throw error;

      toast({
        title: "✅ Webhook Configurado",
        description: data.message || "Webhook configurado com sucesso",
      });

      await loadConfig();
    } catch (error: any) {
      toast({
        title: "❌ Erro ao configurar webhook",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setConfiguringWebhook(false);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-payment-config', {
        body: { config }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao salvar configuração');
      }

      toast({
        title: "✅ Configuração Salva",
        description: `Configuração global atualizada com sucesso! Conta: ${data.mercado_pago_account}`,
      });

      await loadConfig();
    } catch (error: any) {
      toast({
        title: "❌ Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (hasAccess === null) {
    return (
      <div className="container mx-auto py-8 max-w-4xl flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // No access
  if (!hasAccess) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            <p className="mb-4">
              Você não tem permissão para acessar esta página. Apenas professores e administradores podem configurar pagamentos.
            </p>
            <div className="space-y-2 text-sm">
              <p><strong>Seu role atual:</strong> {userRole || 'Não definido'}</p>
              <p><strong>Roles permitidos:</strong> teacher, admin</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="mt-4"
            >
              Voltar para Home
            </Button>
            <Button 
              variant="link" 
              onClick={() => navigate('/admin/payment-config-debug')} 
              className="mt-4 ml-2"
            >
              Ir para Diagnóstico
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configuração Global de Pagamentos
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure as credenciais do Mercado Pago para todo o sistema
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          👤 Logado como: {user?.email} ({userRole})
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>⚠️ Configuração Crítica do Sistema</AlertTitle>
        <AlertDescription>
          Esta configuração afeta TODOS os professores e transações do sistema. 
          {stats.activeTeachers > 0 && (
            <> Atualmente há <strong>{stats.activeTeachers} professores</strong> e <strong>{stats.totalTransactions} transações</strong> dependendo desta configuração.</>
          )}
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Credenciais do Mercado Pago</CardTitle>
          <CardDescription>
            Forneça as credenciais globais que serão usadas para todas as transações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access_token">Access Token *</Label>
            <Input
              id="access_token"
              type="password"
              placeholder="APP_USR-..."
              value={config.access_token}
              onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="public_key">Public Key</Label>
            <Input
              id="public_key"
              placeholder="APP_USR-..."
              value={config.public_key}
              onChange={(e) => setConfig({ ...config, public_key: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_id">Client ID</Label>
            <Input
              id="client_id"
              placeholder="490789527405557"
              value={config.client_id}
              onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Opcional - Usado para recursos avançados do Mercado Pago
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_secret">Client Secret</Label>
            <Input
              id="client_secret"
              type="password"
              placeholder="ybJ2OqLgSqbmaSJUnCPMl6zRLTAJWooL"
              value={config.client_secret}
              onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Opcional - Usado para recursos avançados do Mercado Pago
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_sandbox">Modo Sandbox (Teste)</Label>
              <p className="text-sm text-muted-foreground">
                Use credenciais de teste do Mercado Pago
              </p>
            </div>
            <Switch
              id="is_sandbox"
              checked={config.is_sandbox}
              onCheckedChange={(checked) => setConfig({ ...config, is_sandbox: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Sistema Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Ativar pagamentos no sistema
              </p>
            </div>
            <Switch
              id="is_active"
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={testCredentials}
              disabled={testingCredentials || !config.access_token}
            >
              {testingCredentials ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Testar Credenciais
                </>
              )}
            </Button>

            <Button
              onClick={saveConfig}
              disabled={loading || !config.access_token}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Salvar Configuração Global
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook do Mercado Pago</CardTitle>
          <CardDescription>
            Configure o webhook para receber notificações de pagamento em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={configureWebhook}
            disabled={configuringWebhook || !config.is_active}
            variant="outline"
          >
            {configuringWebhook ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Configurando...
              </>
            ) : (
              <>
                <Webhook className="h-4 w-4 mr-2" />
                Auto-Configurar Webhook
              </>
            )}
          </Button>
          {!config.is_active && (
            <p className="text-sm text-muted-foreground mt-2">
              Ative o sistema antes de configurar o webhook
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
