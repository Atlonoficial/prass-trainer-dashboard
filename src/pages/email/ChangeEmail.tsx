import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTokenProcessor } from '@/hooks/useTokenProcessor'

export default function ChangeEmail() {
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
              <div className="relative">
                <Mail className="h-12 w-12 text-primary" />
                <Loader2 className="h-6 w-6 text-primary animate-spin absolute -top-1 -right-1" />
              </div>
            )}
            {status === 'success' && (
              <div className="relative">
                <Mail className="h-12 w-12 text-primary" />
                <CheckCircle className="h-6 w-6 text-green-500 absolute -top-1 -right-1" />
              </div>
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === 'processing' && 'Confirmando alteração...'}
            {status === 'success' && 'Email alterado!'}
            {status === 'error' && 'Erro na confirmação'}
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Processando a confirmação do seu novo email...'}
            {status === 'success' && 'Seu endereço de email foi alterado com sucesso.'}
            {status === 'error' && 'Não foi possível confirmar a alteração. O link pode estar expirado.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'success' && (
            <>
              <p className="text-sm text-muted-foreground">
                Redirecionando automaticamente em alguns segundos...
              </p>
              <Button onClick={handleContinue} className="w-full">
                Continuar
              </Button>
            </>
          )}
          {status === 'error' && (
            <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
              Voltar ao Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}