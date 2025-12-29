import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTokenProcessor } from '@/hooks/useTokenProcessor'

export default function MagicLink() {
  const navigate = useNavigate()
  const { isProcessing, hasToken } = useTokenProcessor()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')

  useEffect(() => {
    if (!isProcessing && hasToken) {
      setStatus('success')
      // Redirect to dashboard after 2 seconds
      const timer = setTimeout(() => {
        navigate('/', { replace: true })
      }, 2000)
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
                <Zap className="h-12 w-12 text-primary" />
                <Loader2 className="h-6 w-6 text-primary animate-spin absolute -top-1 -right-1" />
              </div>
            )}
            {status === 'success' && (
              <div className="relative">
                <Zap className="h-12 w-12 text-primary" />
                <CheckCircle className="h-6 w-6 text-green-500 absolute -top-1 -right-1" />
              </div>
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === 'processing' && 'Processando Magic Link...'}
            {status === 'success' && 'Login realizado!'}
            {status === 'error' && 'Magic Link inválido'}
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Verificando seu link mágico de acesso...'}
            {status === 'success' && 'Você foi conectado com sucesso via Magic Link.'}
            {status === 'error' && 'O Magic Link é inválido ou expirou. Solicite um novo.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'success' && (
            <>
              <p className="text-sm text-muted-foreground">
                Redirecionando automaticamente...
              </p>
              <Button onClick={handleContinue} className="w-full">
                Acessar Sistema
              </Button>
            </>
          )}
          {status === 'error' && (
            <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
              Solicitar Novo Magic Link
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}