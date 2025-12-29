import { ReactNode } from 'react'
import { useStudentSubscription } from '@/hooks/useStudentSubscription'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Lock, Loader2 } from 'lucide-react'

interface SubscriptionGuardProps {
  children: ReactNode
  userId?: string
  requiredFeature?: string
  fallbackPath?: string
}

export function SubscriptionGuard({ 
  children, 
  userId,
  requiredFeature,
  fallbackPath = '/plans' 
}: SubscriptionGuardProps) {
  const { subscription, loading, hasAccess } = useStudentSubscription(userId)
  const navigate = useNavigate()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Verificando acesso...</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Lock className="h-12 w-12 mx-auto text-destructive" />
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Acesso Restrito</AlertTitle>
                <AlertDescription>
                  Você precisa de uma assinatura ativa para acessar este conteúdo.
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate(fallbackPath)} className="w-full">
                Ver Planos Disponíveis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Verificar se tem a feature específica
  if (requiredFeature && subscription?.features) {
    const features = Array.isArray(subscription.features) 
      ? subscription.features 
      : []
    const hasFeature = features.includes(requiredFeature)
    
    if (!hasFeature) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Lock className="h-12 w-12 mx-auto text-warning" />
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Recurso Não Incluído</AlertTitle>
                  <AlertDescription>
                    Seu plano atual não inclui acesso a este recurso.
                    Faça upgrade para desbloquear.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => navigate(fallbackPath)} className="w-full">
                  Ver Planos com Este Recurso
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  }
  
  return <>{children}</>
}
