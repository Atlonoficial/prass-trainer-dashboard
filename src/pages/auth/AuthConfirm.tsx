import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Componente canônico para confirmação de email
 * Rota: /auth/confirm
 * Suporta PKCE (code) e legacy (token_hash)
 */
export default function AuthConfirm() {
  console.log('[AuthConfirm] Componente carregado')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')

  useEffect(() => {
    const confirmAuth = async () => {
      try {
        // 1. LOG INICIAL - Debug completo
        console.log('[AuthConfirm] Iniciando confirmação:', {
          code: searchParams.get('code'),
          token_hash: searchParams.get('token_hash'),
          type: searchParams.get('type'),
          src: searchParams.get('src'),
          slug: searchParams.get('slug'),
          returnTo: searchParams.get('returnTo')
        })

        // 2. DETECTAR TIPO DE TOKEN
        const code = searchParams.get('code')
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        const src = searchParams.get('src')
        const returnTo = searchParams.get('returnTo')

        let sessionResult

        // 3. PROCESSAR TOKEN (PKCE tem prioridade)
        if (code) {
          // PKCE flow (recomendado)
          console.log('[AuthConfirm] Usando PKCE exchangeCodeForSession')
          sessionResult = await supabase.auth.exchangeCodeForSession(code)
        } else if (tokenHash) {
          // Legacy flow (token_hash)
          console.log('[AuthConfirm] Usando verifyOtp com token_hash')
          sessionResult = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type as any) || 'signup'
          })
        } else {
          throw new Error('Nenhum token de confirmação encontrado na URL')
        }

        if (sessionResult.error) throw sessionResult.error

        // 4. OBTER USER METADATA
        const user = sessionResult.data.user
        const userType = user?.user_metadata?.user_type
        
        console.log('[AuthConfirm] ✅ Confirmação bem-sucedida:', {
          user_id: user?.id,
          email: user?.email,
          user_type: userType,
          src_param: src,
          all_metadata: user?.user_metadata
        })

        // 5. DETERMINAR DESTINO FINAL
        let redirectPath = '/'
        
        if (userType === 'teacher' || src === 'dashboard') {
          redirectPath = '/professor/dashboard'
          console.log('[AuthConfirm] 🎓 Redirecionando PROFESSOR para:', redirectPath)
        } else {
          console.log('[AuthConfirm] 👨‍🎓 Redirecionando ALUNO para:', redirectPath)
        }

        // Se há returnTo, usar ele
        if (returnTo) {
          redirectPath = decodeURIComponent(returnTo)
          console.log('[AuthConfirm] 🔄 Usando returnTo:', redirectPath)
        }

        setStatus('success')
        toast({
          title: "✅ Email confirmado!",
          description: "Sua conta foi ativada com sucesso.",
        })

        // 6. REDIRECIONAR (delay para feedback visual)
        setTimeout(() => {
          navigate(redirectPath, { replace: true })
        }, 2000)

      } catch (error: any) {
        console.error('[AuthConfirm] ❌ Erro na confirmação:', error)
        setStatus('error')
        
        toast({
          title: "❌ Erro na confirmação",
          description: error.message || "Link inválido ou expirado.",
          variant: "destructive",
        })

        // Redirecionar para login após erro
        setTimeout(() => {
          navigate('/auth', { replace: true })
        }, 3000)
      }
    }

    confirmAuth()
  }, [searchParams, navigate, toast])

  // UI de status
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'processing' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === 'processing' && 'Confirmando sua conta...'}
            {status === 'success' && 'Conta confirmada!'}
            {status === 'error' && 'Erro na confirmação'}
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Processando seu link de confirmação...'}
            {status === 'success' && 'Bem-vindo! Sua conta foi confirmada com sucesso.'}
            {status === 'error' && 'Não foi possível confirmar sua conta. O link pode estar expirado.'}
          </CardDescription>
        </CardHeader>
        {(status === 'success' || status === 'error') && (
          <CardContent className="text-center space-y-4">
            {status === 'success' && (
              <p className="text-sm text-muted-foreground">
                Redirecionando automaticamente em alguns segundos...
              </p>
            )}
            {status === 'error' && (
              <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
                Voltar ao Login
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
