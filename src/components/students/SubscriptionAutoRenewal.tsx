import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Subscription {
  id: string
  plan_id: string
  status: string
  start_date: string
  end_date: string
  auto_renew: boolean
  plan?: {
    name: string
    price: number
    currency: string
    interval: string
  }
}

interface SubscriptionAutoRenewalProps {
  subscription: Subscription
  onUpdate?: () => void
}

export function SubscriptionAutoRenewal({ subscription, onUpdate }: SubscriptionAutoRenewalProps) {
  const [autoRenew, setAutoRenew] = useState(subscription.auto_renew)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const daysUntilExpiry = Math.ceil(
    (new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const handleToggleAutoRenew = async (checked: boolean) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('active_subscriptions')
        .update({ auto_renew: checked })
        .eq('id', subscription.id)

      if (error) throw error

      setAutoRenew(checked)
      toast({
        title: checked ? 'Renovação automática ativada' : 'Renovação automática desativada',
        description: checked 
          ? 'Você será notificado 3 dias antes do vencimento para confirmar o pagamento.'
          : 'Você precisará renovar manualmente sua assinatura.',
      })
      
      onUpdate?.()
    } catch (error) {
      console.error('Error toggling auto-renewal:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível alterar a configuração de renovação automática.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Renovação Automática</h3>
          <p className="text-sm text-muted-foreground">
            Ative para receber lembretes e link de pagamento antes do vencimento
          </p>
        </div>
        <Switch
          checked={autoRenew}
          onCheckedChange={handleToggleAutoRenew}
          disabled={loading || subscription.status !== 'active'}
        />
      </div>

      {subscription.status === 'active' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Expira em {daysUntilExpiry} {daysUntilExpiry === 1 ? 'dia' : 'dias'}
            </span>
            {daysUntilExpiry <= 7 && (
              <Badge variant={daysUntilExpiry <= 3 ? 'destructive' : 'warning'}>
                {daysUntilExpiry <= 3 ? 'Urgente' : 'Em breve'}
              </Badge>
            )}
          </div>

          {autoRenew ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Você receberá uma notificação com o link de pagamento 3 dias antes do vencimento.
                Após o pagamento, sua assinatura será automaticamente renovada por mais{' '}
                {subscription.plan?.interval === 'month' ? '1 mês' : 
                 subscription.plan?.interval === 'year' ? '1 ano' : 
                 subscription.plan?.interval}.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você precisará renovar manualmente sua assinatura antes do vencimento para continuar 
                com acesso ao conteúdo.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {subscription.status === 'expired' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sua assinatura expirou. Renove agora para continuar acessando o conteúdo exclusivo.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Plano atual</span>
          <Badge>{subscription.plan?.name || 'Plano'}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Valor da renovação</span>
          <span className="font-semibold">
            {subscription.plan?.currency === 'BRL' ? 'R$' : '$'} {subscription.plan?.price?.toFixed(2)}
          </span>
        </div>
      </div>
    </Card>
  )
}
