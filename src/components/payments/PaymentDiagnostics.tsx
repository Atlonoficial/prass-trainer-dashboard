import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DiagnosticResult {
  check: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: any
}

export function PaymentDiagnostics() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const { toast } = useToast()

  const runDiagnostics = async () => {
    setRunning(true)
    setResults([])
    const diagnostics: DiagnosticResult[] = []

    try {
      // 1. Check user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        diagnostics.push({
          check: 'Authentication',
          status: 'error',
          message: 'User not authenticated',
          details: authError
        })
        setResults(diagnostics)
        return
      }

      diagnostics.push({
        check: 'Authentication',
        status: 'success',
        message: `Authenticated as ${user.email}`,
        details: { user_id: user.id }
      })

      // 2. Check user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        diagnostics.push({
          check: 'User Profile',
          status: 'error',
          message: 'Profile not found',
          details: profileError
        })
      } else {
        diagnostics.push({
          check: 'User Profile',
          status: 'success',
          message: `Profile found - Type: ${profile.user_type}`,
          details: profile
        })
      }

      // 3. Check global payment configuration
      if (profile?.user_type === 'teacher') {
        const { data: paymentSettings, error: settingsError } = await supabase
          .from('system_payment_config')
          .select('*')
          .eq('gateway_type', 'mercadopago')
          .eq('is_active', true)
          .single()

        if (settingsError) {
          diagnostics.push({
            check: 'Payment Settings',
            status: 'error',
            message: 'Failed to fetch global payment configuration',
            details: settingsError
          })
        } else if (!paymentSettings) {
          diagnostics.push({
            check: 'Payment Settings',
            status: 'warning',
            message: 'Sistema não configurado globalmente. Contate o administrador.',
            details: null
          })
        } else {
          const credentials = paymentSettings.credentials as any
          
          let credentialsStatus = 'error'
          let credentialsMessage = 'Invalid credentials'
          
          if (paymentSettings.gateway_type === 'mercadopago' && credentials?.access_token) {
            credentialsStatus = 'success'
            credentialsMessage = `✅ Sistema Global: Mercado Pago (${credentials.is_sandbox ? 'Sandbox' : 'Produção'})`
          }

          diagnostics.push({
            check: 'Payment Settings',
            status: credentialsStatus as any,
            message: credentialsMessage,
            details: {
              gateway: paymentSettings.gateway_type,
              configured_by: 'Administrador (Global)',
              has_access_token: !!credentials?.access_token,
              is_sandbox: credentials?.is_sandbox
            }
          })
        }

        // 4. Check plan catalog
        const { data: plans, error: plansError } = await supabase
          .from('plan_catalog')
          .select('*')
          .eq('teacher_id', user.id)
          .eq('is_active', true)

        if (plansError) {
          diagnostics.push({
            check: 'Plan Catalog',
            status: 'error',
            message: 'Failed to fetch plans',
            details: plansError
          })
        } else {
          diagnostics.push({
            check: 'Plan Catalog',
            status: plans.length > 0 ? 'success' : 'warning',
            message: `Found ${plans.length} active plans`,
            details: plans
          })
        }
      }

      // 5. Test transaction context function
      try {
        const { data: context, error: contextError } = await supabase.rpc('get_transaction_context', {
          p_authenticated_user_id: user.id,
          p_target_student_id: null
        })

        if (contextError) {
          diagnostics.push({
            check: 'Transaction Context',
            status: 'error',
            message: 'Failed to get transaction context',
            details: contextError
          })
        } else {
          diagnostics.push({
            check: 'Transaction Context',
            status: 'success',
            message: `Context type: ${(context as any)?.type || 'unknown'}`,
            details: context
          })
        }
      } catch (error) {
        diagnostics.push({
          check: 'Transaction Context',
          status: 'error',
          message: 'Function call failed',
          details: error
        })
      }

      // 6. Test edge function connectivity
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: { test: true }
        })

        diagnostics.push({
          check: 'Edge Function',
          status: error ? 'error' : 'warning',
          message: error ? 'Edge function error' : 'Edge function accessible (test mode)',
          details: error || data
        })
      } catch (error) {
        diagnostics.push({
          check: 'Edge Function',
          status: 'error',
          message: 'Failed to reach edge function',
          details: error
        })
      }

    } catch (error) {
      diagnostics.push({
        check: 'General',
        status: 'error',
        message: 'Unexpected error during diagnostics',
        details: error
      })
    }

    setResults(diagnostics)
    setRunning(false)

    const hasErrors = diagnostics.some(d => d.status === 'error')
    toast({
      title: hasErrors ? "Diagnóstico concluído com erros" : "Diagnóstico concluído",
      description: `${diagnostics.length} verificações realizadas`,
      variant: hasErrors ? "destructive" : "default"
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Diagnóstico do Sistema de Pagamentos
          <Button 
            onClick={runDiagnostics} 
            disabled={running}
            variant="outline"
            size="sm"
          >
            {running ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {running ? 'Executando...' : 'Executar Diagnóstico'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(result.status)}
                <h3 className="font-medium">{result.check}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
              {result.details && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Ver detalhes</summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
          
          {results.length === 0 && !running && (
            <div className="text-center text-muted-foreground py-8">
              Clique em "Executar Diagnóstico" para verificar o sistema
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}