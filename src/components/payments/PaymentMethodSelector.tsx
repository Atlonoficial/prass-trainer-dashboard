import { Card, CardContent } from '@/components/ui/card';
import { Zap, CreditCard, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
  processing_time: string;
}

const methods: PaymentMethod[] = [
  {
    id: 'pix',
    name: 'PIX',
    description: 'Pagamento instantâneo',
    icon: Zap,
    available: true,
    processing_time: 'Imediato'
  },
  {
    id: 'credit_card',
    name: 'Cartão de Crédito',
    description: 'Até 12x sem juros',
    icon: CreditCard,
    available: true,
    processing_time: '1-2 dias úteis'
  },
  {
    id: 'debit_card',
    name: 'Cartão de Débito',
    description: 'Débito em conta',
    icon: CreditCard,
    available: true,
    processing_time: 'Imediato'
  },
  {
    id: 'boleto',
    name: 'Boleto',
    description: 'Até 3 dias úteis',
    icon: FileText,
    available: true,
    processing_time: '1-3 dias úteis'
  }
];

interface PaymentMethodSelectorProps {
  onSelect: (method: string) => void;
  selected: string;
  allowedMethods?: string[];
}

export function PaymentMethodSelector({ onSelect, selected, allowedMethods }: PaymentMethodSelectorProps) {
  // Filter methods based on allowedMethods prop
  const filteredMethods = allowedMethods 
    ? methods.filter(method => allowedMethods.includes(method.id))
    : methods;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Escolha o método de pagamento</h3>
      <div className="grid grid-cols-2 gap-3">
        {filteredMethods.map(method => {
          const Icon = method.icon;
          return (
            <Card 
              key={method.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary hover:shadow-md",
                selected === method.id && "border-primary bg-primary/5 shadow-md"
              )}
              onClick={() => onSelect(method.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Icon className={cn(
                    "h-5 w-5 mt-0.5",
                    selected === method.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "font-medium text-sm",
                      selected === method.id ? "text-primary" : "text-foreground"
                    )}>
                      {method.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {method.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {method.processing_time}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
