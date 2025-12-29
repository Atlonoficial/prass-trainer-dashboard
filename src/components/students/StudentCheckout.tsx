import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { CreditCard, QrCode, FileText, Loader2 } from 'lucide-react'

interface StudentCheckoutProps {
  planId: string
  planName?: string
  planPrice?: number
  userId?: string
}

export function StudentCheckout({ planId, planName, planPrice, userId }: StudentCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'credit_card' | 'boleto'>('pix')
  
  const handleCheckout = async () => {
    if (!userId) {
      toast.error('Faça login para continuar')
      return
    }

    setLoading(true)
    console.log('🚀 [CHECKOUT] Iniciando checkout', { 
      planId, 
      selectedMethod, 
      userId 
    })
    
    try {
      console.log('📡 [CHECKOUT] Chamando Edge Function...')
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          plan_id: planId,
          payment_method: selectedMethod,
          student_id: userId
        }
      })

      console.log('📥 [CHECKOUT] Resposta recebida', { data, error })

      if (error) {
        console.error('❌ [CHECKOUT] Erro da Edge Function:', {
          message: error.message,
          context: error.context,
          details: error
        })
        throw new Error(error.message || 'Erro ao comunicar com servidor')
      }

      if (!data) {
        throw new Error('Resposta vazia do servidor')
      }

      if (!data.checkout_url) {
        console.error('❌ [CHECKOUT] URL não retornada:', data)
        throw new Error(data.error || 'URL de checkout não retornada')
      }

      console.log('✅ [CHECKOUT] Checkout criado com sucesso!', {
        transaction_id: data.transaction_id,
        checkout_url: data.checkout_url
      })

      toast.success('Checkout criado! Redirecionando...')
      
      // Verificar se está em ambiente mobile (Capacitor)
      const isCapacitor = typeof window !== 'undefined' && 
                         (window as any).Capacitor?.isNativePlatform
      
      if (isCapacitor) {
        console.log('📱 [CHECKOUT] Abrindo no app nativo')
        // TODO: No projeto do aluno, instalar: npm install @capacitor/browser
        // Então descomentar:
        // const { Browser } = await import('@capacitor/browser')
        // await Browser.open({ url: data.checkout_url })
        window.open(data.checkout_url, '_system')
      } else {
        console.log('🌐 [CHECKOUT] Redirecionando no navegador')
        window.location.href = data.checkout_url
      }
    } catch (error: any) {
      console.error('💥 [CHECKOUT] Erro capturado:', error)
      toast.error(error.message || 'Erro ao iniciar pagamento. Verifique o console para detalhes.')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Escolha a forma de pagamento</CardTitle>
        {planName && (
          <CardDescription>
            Plano: {planName} {planPrice && `- R$ ${planPrice.toFixed(2)}`}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <Button
            variant={selectedMethod === 'pix' ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => setSelectedMethod('pix')}
          >
            <QrCode className="mr-2 h-4 w-4" />
            PIX (Aprovação Instantânea)
          </Button>
          
          <Button
            variant={selectedMethod === 'credit_card' ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => setSelectedMethod('credit_card')}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Cartão de Crédito
          </Button>
          
          <Button
            variant={selectedMethod === 'boleto' ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => setSelectedMethod('boleto')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Boleto Bancário
          </Button>
        </div>
        
        <Button 
          onClick={handleCheckout} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            'Finalizar Pagamento'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
