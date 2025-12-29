import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useAuthState } from '@/hooks/useAuthState'
import { useEmergencyReset } from '@/hooks/useEmergencyReset'

export function AuthSystemStatus() {
  const { isHealthy, loading, isAuthenticated, performCompleteAuthReset } = useAuthState()
  const { performEmergencyReset, softReset } = useEmergencyReset()
  const [showStatus, setShowStatus] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Mostra status automaticamente se houver problemas
  useEffect(() => {
    if (!isHealthy || (loading && !isAuthenticated)) {
      const timer = setTimeout(() => setShowStatus(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [isHealthy, loading, isAuthenticated])

  const handleCompleteReset = async () => {
    setIsResetting(true)
    try {
      if (performCompleteAuthReset) {
        performCompleteAuthReset()
        // Recarrega a página após reset
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      console.error('Erro durante reset:', error)
    } finally {
      setIsResetting(false)
    }
  }

  if (!showStatus && isHealthy) return null

  const getStatusIcon = () => {
    if (loading) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (!isHealthy) return <XCircle className="w-4 h-4 text-destructive" />
    if (isAuthenticated) return <CheckCircle className="w-4 h-4 text-success" />
    return <AlertTriangle className="w-4 h-4 text-warning" />
  }

  const getStatusMessage = () => {
    if (loading) return 'Verificando sistema de autenticação...'
    if (!isHealthy) return 'Sistema de autenticação temporariamente indisponível'
    if (isAuthenticated) return 'Sistema funcionando normalmente'
    return 'Aguardando autenticação'
  }

  const getStatusColor = () => {
    if (loading) return 'border-primary'
    if (!isHealthy) return 'border-destructive'
    if (isAuthenticated) return 'border-success'
    return 'border-warning'
  }

  return (
    <Card className={`p-4 ${getStatusColor()} border-2`}>
      <div className="flex items-center gap-3 mb-3">
        {getStatusIcon()}
        <span className="font-medium">Status do Sistema</span>
      </div>
      
      <Alert className="mb-4">
        <AlertDescription>{getStatusMessage()}</AlertDescription>
      </Alert>

      {!isHealthy && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Caso o problema persista, você pode tentar um reset completo do sistema:
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCompleteReset}
            disabled={isResetting}
            className="w-full"
          >
            {isResetting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Executando Reset...
              </>
            ) : (
              'Reset Completo do Sistema'
            )}
          </Button>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowStatus(false)}
        className="w-full mt-2"
      >
        Ocultar Status
      </Button>
    </Card>
  )
}