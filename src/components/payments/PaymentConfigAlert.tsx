import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Settings } from 'lucide-react'
import { usePaymentValidation } from '@/hooks/usePaymentValidation'

interface PaymentConfigAlertProps {
  onConfigureClick?: () => void
  className?: string
}

export function PaymentConfigAlert({ onConfigureClick, className }: PaymentConfigAlertProps) {
  const { getPaymentConfigStatus } = usePaymentValidation()
  const configStatus = getPaymentConfigStatus()

  if (configStatus.status === 'configured') {
    return null
  }

  const handleConfigureClick = () => {
    if (onConfigureClick) {
      onConfigureClick()
    } else {
      window.location.href = '/admin/payment-config'
    }
  }

  return (
    <Alert variant="default" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Sistema de Pagamentos</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{configStatus.message}</span>
        {configStatus.action === 'contact_admin' && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleConfigureClick}
            className="ml-4"
          >
            <Settings className="h-4 w-4 mr-1" />
            Ver Configuração (Admin)
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
