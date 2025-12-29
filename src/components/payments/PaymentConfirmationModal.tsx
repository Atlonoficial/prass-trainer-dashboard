import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, CreditCard, Shield, Zap, FileText } from 'lucide-react';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  plan: {
    name: string;
    price: number;
    interval: string;
    description?: string;
  };
  paymentMethod: string;
  loading?: boolean;
}

const getPaymentMethodName = (method: string): string => {
  const methods: Record<string, string> = {
    'pix': 'PIX',
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'boleto': 'Boleto Bancário'
  };
  return methods[method] || 'PIX';
};

const getPaymentMethodIcon = (method: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    'pix': Zap,
    'credit_card': CreditCard,
    'debit_card': CreditCard,
    'boleto': FileText
  };
  return icons[method] || Zap;
};

export function PaymentConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  plan, 
  paymentMethod,
  loading = false 
}: PaymentConfirmationModalProps) {
  const Icon = getPaymentMethodIcon(paymentMethod);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 flex-shrink-0">
          <DialogTitle>Confirmar Pagamento</DialogTitle>
        </DialogHeader>
        
        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  R$ {plan.price.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{plan.interval === 'monthly' ? 'mês' : plan.interval === 'yearly' ? 'ano' : plan.interval}
                </span>
              </div>
              
              <Badge className="gap-1.5" variant="secondary">
                <Icon className="h-3.5 w-3.5" />
                {getPaymentMethodName(paymentMethod)}
              </Badge>
              
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.description}
                </p>
              )}
            </CardContent>
          </Card>
          
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Pagamento Seguro</AlertTitle>
            <AlertDescription>
              Você será redirecionado para o Mercado Pago para completar o pagamento de forma segura.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Continuar para Pagamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
