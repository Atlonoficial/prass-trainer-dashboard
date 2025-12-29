import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiagnosticCheck {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function AdminPaymentConfigDebug() {
  const { user, userId, userRole, tenantId } = useUnifiedAuth();
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    console.log('🔍 DEBUG PAGE: Mounted with auth state:', { user, userId, userRole, tenantId });
  }, [user, userId, userRole, tenantId]);

  const runDiagnostics = async () => {
    setRunning(true);
    const results: DiagnosticCheck[] = [];

    // Check 1: User authentication
    console.log('🔍 CHECK 1: User authentication');
    results.push({
      name: 'Autenticação de Usuário',
      status: user ? 'success' : 'error',
      message: user ? `Usuário autenticado: ${user.email}` : 'Usuário não autenticado',
      details: { userId, email: user?.email }
    });

    // Check 2: User role from profiles
    console.log('🔍 CHECK 2: User role from profiles');
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_type, id, email, name')
        .eq('id', userId)
        .single();

      console.log('📦 Profile data:', { profile, error });

      results.push({
        name: 'Role em profiles.user_type',
        status: profile?.user_type ? 'success' : 'error',
        message: profile?.user_type 
          ? `Role no profile: ${profile.user_type}` 
          : 'Nenhum user_type encontrado no profile',
        details: profile
      });
    } catch (error: any) {
      results.push({
        name: 'Role em profiles.user_type',
        status: 'error',
        message: `Erro ao buscar profile: ${error.message}`,
        details: error
      });
    }

    // Check 3: User role in user_roles table
    console.log('🔍 CHECK 3: User role in user_roles table');
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      console.log('📦 User roles data:', { roles, error });

      results.push({
        name: 'Roles na tabela user_roles',
        status: roles && roles.length > 0 ? 'success' : 'error',
        message: roles && roles.length > 0 
          ? `${roles.length} role(s) encontrado(s): ${roles.map(r => r.role).join(', ')}` 
          : 'Nenhum role encontrado na tabela user_roles',
        details: roles
      });
    } catch (error: any) {
      results.push({
        name: 'Roles na tabela user_roles',
        status: 'error',
        message: `Erro ao buscar roles: ${error.message}`,
        details: error
      });
    }

    // Check 4: Test has_role function
    console.log('🔍 CHECK 4: Test has_role function');
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'teacher'
      });

      console.log('📦 has_role result:', { data, error });

      results.push({
        name: 'Função has_role(teacher)',
        status: data === true ? 'success' : 'error',
        message: data === true 
          ? 'Função has_role retornou TRUE para teacher' 
          : `Função has_role retornou FALSE (resultado: ${data})`,
        details: { result: data, error }
      });
    } catch (error: any) {
      results.push({
        name: 'Função has_role(teacher)',
        status: 'error',
        message: `Erro ao chamar has_role: ${error.message}`,
        details: error
      });
    }

    // Check 5: Try to read system_payment_config
    console.log('🔍 CHECK 5: Try to read system_payment_config');
    try {
      const { data, error } = await supabase
        .from('system_payment_config')
        .select('*')
        .eq('gateway_type', 'mercadopago');

      console.log('📦 Payment config data:', { data, error });

      results.push({
        name: 'Acesso a system_payment_config',
        status: error ? 'error' : 'success',
        message: error 
          ? `Erro ao acessar configuração: ${error.message}` 
          : `Acesso concedido! ${data?.length || 0} registro(s) encontrado(s)`,
        details: { data, error, errorCode: error?.code }
      });
    } catch (error: any) {
      results.push({
        name: 'Acesso a system_payment_config',
        status: 'error',
        message: `Erro ao acessar configuração: ${error.message}`,
        details: error
      });
    }

    // Check 6: Summary
    console.log('🔍 CHECK 6: Summary');
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    results.push({
      name: 'Resumo do Diagnóstico',
      status: errorCount === 0 ? 'success' : 'error',
      message: `${successCount} check(s) bem-sucedido(s), ${errorCount} erro(s)`,
      details: { successCount, errorCount, total: results.length }
    });

    setChecks(results);
    setRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          🔍 Diagnóstico de Sistema de Roles
        </h1>
        <p className="text-muted-foreground mt-2">
          Página de diagnóstico sem RoleGuard para verificar o sistema de autenticação e roles
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Estado Atual de Autenticação</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-1 font-mono text-xs">
            <div>User ID: {userId || 'N/A'}</div>
            <div>Email: {user?.email || 'N/A'}</div>
            <div>Role (useUnifiedAuth): {userRole || 'N/A'}</div>
            <div>Tenant ID: {tenantId || 'N/A'}</div>
          </div>
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Executar Diagnóstico Completo</CardTitle>
          <CardDescription>
            Verifica autenticação, roles, RLS e acesso ao banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={running}>
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executando diagnóstico...
              </>
            ) : (
              'Executar Diagnóstico'
            )}
          </Button>
        </CardContent>
      </Card>

      {checks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados do Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checks.map((check, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold">{check.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
                    {check.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          Ver detalhes técnicos
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(check.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
