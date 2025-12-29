/**
 * @deprecated Este componente foi substituído por /auth/confirm
 * Mantido temporariamente para compatibilidade com links antigos em emails já enviados
 * 
 * NOVA ROTA: /auth/confirm (AuthConfirm.tsx)
 * 
 * Esta rota específica do dashboard será removida em breve.
 * Todos os novos signups devem usar /auth/confirm
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'

/**
 * Página de confirmação de email para Dashboard do Professor
 * Rota: /dashboard/auth/confirm
 */
export default function DashboardAuthConfirm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        console.log('[DashboardAuthConfirm] Processando confirmação de email...')
        
        // Extrair tokens da URL
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        
        if (!token_hash || type !== 'signup') {
          throw new Error('Link de confirmação inválido')
        }

        // Verificar a sessão do Supabase
        const { data: { session }, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'signup'
        })

        if (error) throw error

        if (session) {
          console.log('[DashboardAuthConfirm] Email confirmado com sucesso!')
          setStatus('success')
          
          toast({
            title: "✅ Email confirmado!",
            description: "Sua conta foi ativada com sucesso.",
          })

          // Redirecionar para dashboard após 2 segundos
          setTimeout(() => {
            navigate('/professor/dashboard')
          }, 2000)
        } else {
          throw new Error('Sessão não encontrada')
        }
      } catch (error: any) {
        console.error('[DashboardAuthConfirm] Erro:', error)
        setStatus('error')
        
        toast({
          title: "❌ Erro na confirmação",
          description: error.message || "Não foi possível confirmar seu email.",
          variant: "destructive",
        })

        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate('/auth')
        }, 3000)
      }
    }

    confirmEmail()
  }, [searchParams, navigate, toast])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <div className="text-center space-y-4 p-8">
        {status === 'loading' && (
          <>
            <LoadingSpinner />
            <h2 className="text-2xl font-bold">Confirmando email...</h2>
            <p className="text-muted-foreground">Aguarde enquanto verificamos sua conta</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-500">Email confirmado!</h2>
            <p className="text-muted-foreground">Redirecionando para o dashboard...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-500">Erro na confirmação</h2>
            <p className="text-muted-foreground">Redirecionando para login...</p>
          </>
        )}
      </div>
    </div>
  )
}
