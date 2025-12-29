import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Zap, CreditCard, FileText, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface PaymentMethod {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  processingTime: string
}

const availableMethods: PaymentMethod[] = [
  {
    id: 'pix',
    name: 'PIX',
    icon: Zap,
    description: 'Pagamento instantâneo via QR Code',
    processingTime: 'Imediato'
  },
  {
    id: 'credit_card',
    name: 'Cartão de Crédito',
    icon: CreditCard,
    description: 'Parcelamento em até 12x sem juros',
    processingTime: '1-2 dias úteis'
  },
  {
    id: 'boleto',
    name: 'Boleto Bancário',
    icon: FileText,
    description: 'Pagamento com código de barras',
    processingTime: '1-3 dias úteis'
  }
]

export default function PaymentMethodsConfig() {
  const [allowedMethods, setAllowedMethods] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('system_payment_config')
        .select('allowed_payment_methods')
        .eq('gateway_type', 'mercadopago')
        .single()

      if (error) {
        console.error('Error fetching config:', error)
        // Default to all methods if no config exists
        setAllowedMethods(['pix', 'credit_card', 'boleto'])
      } else {
        const methods = data.allowed_payment_methods as string[]
        setAllowedMethods(methods || ['pix', 'credit_card', 'boleto'])
      }
    } catch (error) {
      console.error('Error in fetchConfig:', error)
      setAllowedMethods(['pix', 'credit_card', 'boleto'])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMethod = (methodId: string) => {
    setAllowedMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(m => m !== methodId)
        : [...prev, methodId]
    )
  }

  const handleSave = async () => {
    if (allowedMethods.length === 0) {
      toast({
        title: 'Erro de Validação',
        description: 'Você deve selecionar pelo menos um método de pagamento',
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('system_payment_config')
        .update({ 
          allowed_payment_methods: allowedMethods,
          updated_at: new Date().toISOString()
        })
        .eq('gateway_type', 'mercadopago')

      if (error) throw error

      toast({
        title: 'Configuração Salva',
        description: `${allowedMethods.length} método(s) de pagamento habilitado(s)`,
      })
    } catch (error) {
      console.error('Error saving config:', error)
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível atualizar as configurações',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Métodos de Pagamento</h1>
        <p className="text-muted-foreground mt-2">
          Configure quais métodos de pagamento estarão disponíveis para seus alunos
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Informação Importante</AlertTitle>
        <AlertDescription>
          Os métodos selecionados aparecerão na página de pagamentos para todos os seus alunos.
          Você pode habilitar ou desabilitar métodos a qualquer momento.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Métodos Disponíveis</CardTitle>
          <CardDescription>
            Selecione os métodos de pagamento que deseja disponibilizar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {availableMethods.map(method => {
              const Icon = method.icon
              const isEnabled = allowedMethods.includes(method.id)
              
              return (
                <div 
                  key={method.id} 
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleToggleMethod(method.id)}
                >
                  <Checkbox
                    checked={isEnabled}
                    onCheckedChange={() => handleToggleMethod(method.id)}
                    className="mt-1"
                  />
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-md ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{method.name}</span>
                        {isEnabled && (
                          <Badge variant="secondary" className="text-xs">Ativo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {method.description}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Tempo de processamento: {method.processingTime}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Métodos Selecionados
                </p>
                <p className="text-sm text-muted-foreground">
                  {allowedMethods.length} de {availableMethods.length} método(s) ativo(s)
                </p>
              </div>
              <div className="flex gap-2">
                {allowedMethods.map(methodId => {
                  const method = availableMethods.find(m => m.id === methodId)
                  if (!method) return null
                  const Icon = method.icon
                  return (
                    <Badge key={methodId} variant="secondary" className="flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {method.name}
                    </Badge>
                  )
                })}
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              className="w-full"
              disabled={saving || allowedMethods.length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
