/**
 * @deprecated Este componente foi substituído por /auth/confirm
 * Mantido temporariamente para compatibilidade com links antigos em emails já enviados
 * 
 * NOVA ROTA: /auth/confirm (AuthConfirm.tsx)
 * 
 * Redirecionamento automático configurado em App.tsx:
 * /email/confirm → /auth/confirm
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTokenProcessor } from '@/hooks/useTokenProcessor'

export default function ConfirmSignup() {
  const navigate = useNavigate()
  const { isProcessing, hasToken } = useTokenProcessor()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')

  useEffect(() => {
    if (!isProcessing && hasToken) {
      setStatus('success')
      // Redirect to dashboard after 3 seconds
      const timer = setTimeout(() => {
        navigate('/', { replace: true })
      }, 3000)
      return () => clearTimeout(timer)
    } else if (!isProcessing && !hasToken) {
      setStatus('error')
    }
  }, [isProcessing, hasToken, navigate])

  const handleContinue = () => {
    navigate('/', { replace: true })
  }

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
        <CardContent className="text-center space-y-4">
          {status === 'success' && (
            <>
              <p className="text-sm text-muted-foreground">
                Redirecionando automaticamente em alguns segundos...
              </p>
              <Button onClick={handleContinue} className="w-full">
                Continuar para o Sistema
              </Button>
            </>
          )}
          {status === 'error' && (
            <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
              Tentar Novamente
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}