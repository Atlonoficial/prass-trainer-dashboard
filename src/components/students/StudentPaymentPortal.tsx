import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { usePlans } from '@/hooks/usePlans'
import { useSubscriptionManager } from '@/hooks/useSubscriptionManager'
import { usePaymentProcessing } from '@/hooks/usePaymentProcessing'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector'
import { PaymentConfirmationModal } from '@/components/payments/PaymentConfirmationModal'
import { 
  CreditCard, 
  Calendar, 
  Crown, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Star,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Subscription {
  id: string
  status: string
  start_at: string
  end_at: string
  plan_catalog: {
    name: string
    price: number
    interval: string
    features: Array<{
      feature_name: string
      description: string
    }>
  }
}

export function StudentPaymentPortal() {
  const { user } = useAuth()
  const { plans } = usePlans()
  const { getUserSubscriptions } = useSubscriptionManager()
  const { createCheckout } = usePaymentProcessing()
  const { toast } = useToast()
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState('pix')
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null)
  const [allowedMethods, setAllowedMethods] = useState<string[]>(['pix', 'credit_card', 'boleto'])

  const fetchSubscriptions = async () => {
    if (!user) return

    setLoading(true)
    try {
      const userSubscriptions = await getUserSubscriptions(user.id)
      setSubscriptions(userSubscriptions)
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlanPurchase = async () => {
    if (!selectedPlan) return
    
    try {
      setCheckoutLoading(selectedPlan.id)
      console.log('[StudentPaymentPortal] Creating checkout for plan:', selectedPlan.id, 'with method:', selectedMethod)

      const result = await createCheckout(selectedPlan.id, null, selectedMethod)
      
      if (result.checkout_url) {
        window.open(result.checkout_url, '_blank')
        toast({
          title: 'Redirecionando para pagamento',
          description: 'Você será redirecionado para completar o pagamento'
        })
        setConfirmModalOpen(false)
      } else {
        throw new Error('URL de pagamento não retornada')
      }
    } catch (error: any) {
      console.error('[StudentPaymentPortal] Checkout error:', error)
      toast({
        title: 'Erro no pagamento',
        description: error.message || 'Não foi possível processar o pagamento',
        variant: 'destructive'
      })
    } finally {
      setCheckoutLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { 
        color: 'bg-success text-white', 
        label: 'Ativo', 
        icon: CheckCircle 
      },
      pending: { 
        color: 'bg-warning text-black', 
        label: 'Pendente', 
        icon: Clock 
      },
      expired: { 
        color: 'bg-destructive text-white', 
        label: 'Expirado', 
        icon: AlertTriangle 
      },
      cancelled: { 
        color: 'bg-muted text-muted-foreground', 
        label: 'Cancelado', 
        icon: AlertTriangle 
      }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const IconComponent = config.icon
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatInterval = (interval: string) => {
    const intervals = {
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      yearly: 'Anual'
    }
    return intervals[interval as keyof typeof intervals] || interval
  }

  useEffect(() => {
    fetchSubscriptions()
    fetchAllowedMethods()
  }, [user])

  const fetchAllowedMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('system_payment_config')
        .select('allowed_payment_methods')
        .eq('gateway_type', 'mercadopago')
        .single()

      if (data?.allowed_payment_methods) {
        const methods = data.allowed_payment_methods as string[]
        setAllowedMethods(methods)
        // Set first allowed method as default
        if (methods.length > 0) {
          setSelectedMethod(methods[0])
        }
      }
    } catch (error) {
      console.error('Error fetching allowed methods:', error)
      // Keep default methods on error
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Portal de Pagamentos</h2>
        <p className="text-muted-foreground">
          Gerencie suas assinaturas e explore novos planos
        </p>
      </div>

      {/* Assinaturas Ativas */}
      {subscriptions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Minhas Assinaturas</h3>
          <div className="grid gap-4">
            {subscriptions.map((subscription) => (
              <Card key={subscription.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      {subscription.plan_catalog.name}
                    </CardTitle>
                    {getStatusBadge(subscription.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Preço:</span>
                      <div className="font-medium">
                        R$ {subscription.plan_catalog.price.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Período:</span>
                      <div className="font-medium">
                        {formatInterval(subscription.plan_catalog.interval)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Início:</span>
                      <div className="font-medium">
                        {format(new Date(subscription.start_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vencimento:</span>
                      <div className="font-medium">
                        {format(new Date(subscription.end_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                  </div>

                  {subscription.plan_catalog.features && subscription.plan_catalog.features.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Funcionalidades Incluídas:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {subscription.plan_catalog.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-success" />
                            <span>{feature.feature_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Planos Disponíveis */}
      {plans && plans.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Planos Disponíveis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.filter(plan => plan.is_active).map((plan) => {
              const hasActiveSubscription = subscriptions.some(
                sub => sub.plan_catalog && sub.status === 'active' && 
                       sub.plan_catalog.name === plan.name
              )

              return (
                <Card key={plan.id} className={`relative ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}>
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Star className="h-3 w-3 mr-1" />
                        Recomendado
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{formatInterval(plan.interval).toLowerCase()}
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {plan.features && plan.features.length > 0 && (
                      <div className="space-y-2">
                        {plan.features.slice(0, 5).map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-success" />
                            <span>{feature}</span>
                          </div>
                        ))}
                        {plan.features.length > 5 && (
                          <div className="text-sm text-muted-foreground">
                            +{plan.features.length - 5} outras funcionalidades
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!hasActiveSubscription && (
                      <div className="space-y-3">
                        <PaymentMethodSelector 
                          selected={selectedMethod}
                          onSelect={setSelectedMethod}
                          allowedMethods={allowedMethods}
                        />
                      </div>
                    )}
                    
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedPlan(plan)
                        setConfirmModalOpen(true)
                      }}
                      disabled={hasActiveSubscription || checkoutLoading === plan.id}
                      variant={hasActiveSubscription ? 'secondary' : 'default'}
                    >
                      {checkoutLoading === plan.id ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processando...</span>
                        </div>
                      ) : hasActiveSubscription ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Plano Ativo
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Assinar Agora
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Carregando informações...</p>
        </div>
      )}

      {selectedPlan && (
        <PaymentConfirmationModal
          isOpen={confirmModalOpen}
          onClose={() => {
            setConfirmModalOpen(false)
            setSelectedPlan(null)
          }}
          onConfirm={handlePlanPurchase}
          plan={{
            name: selectedPlan.name,
            price: selectedPlan.price,
            interval: formatInterval(selectedPlan.interval),
            description: selectedPlan.description || undefined
          }}
          paymentMethod={selectedMethod}
          loading={checkoutLoading === selectedPlan.id}
        />
      )}
    </div>
  )
}
