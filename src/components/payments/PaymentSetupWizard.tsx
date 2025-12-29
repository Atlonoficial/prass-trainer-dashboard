import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, CreditCard, Settings } from 'lucide-react'

export function PaymentSetupWizard() {
  const navigate = useNavigate()

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          Sistema Configurado Globalmente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-success bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success-foreground">
            <strong>✅ Ótimas notícias!</strong>
            <br />
            O sistema de pagamentos está configurado globalmente pelo administrador.
            Você pode começar a criar planos e receber pagamentos imediatamente.
          </AlertDescription>
        </Alert>

        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Mercado Pago</h4>
              <p className="text-sm text-muted-foreground">Configurado e pronto para uso</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">O que você pode fazer agora:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Criar planos de consultoria com preços personalizados</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Seus alunos podem comprar planos usando Pix, Cartão ou Boleto</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Pagamentos são processados automaticamente pelo sistema</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span>Você recebe notificações de todos os pagamentos em tempo real</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/plans')}
            className="flex-1"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Criar Planos
          </Button>
          <Button 
            onClick={() => navigate('/admin/payment-config')}
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Ver Configuração
          </Button>
        </div>

        <Alert>
          <AlertDescription className="text-sm">
            <strong>💡 Dica:</strong> Não é necessário configurar credenciais individuais. 
            O administrador gerencia o sistema de pagamentos centralmente para garantir 
            segurança e facilidade de manutenção.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}