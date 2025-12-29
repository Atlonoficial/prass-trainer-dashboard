import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Crown, Star, Diamond, Trophy, Gem, CreditCard } from "lucide-react";
import { PlanCatalog, usePlans } from "@/hooks/usePlans";
import { getPlanIcon } from "@/components/plans/PlanIconSelector";
import { toast } from "sonner";

interface PlanRequestModalProps {
  availablePlans: PlanCatalog[];
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
}

export function PlanRequestModal({ availablePlans, isOpen, onClose, teacherId }: PlanRequestModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanCatalog | null>(null);
  const [requesting, setRequesting] = useState(false);
  const { requestSubscription } = usePlans();

  const handlePlanSelect = (plan: PlanCatalog) => {
    setSelectedPlan(plan);
  };

  const handleRequestSubscription = async () => {
    if (!selectedPlan) return;

    try {
      setRequesting(true);
      await requestSubscription(selectedPlan.id, teacherId);
      toast.success("Solicitação enviada com sucesso! Aguarde a aprovação do professor.");
      onClose();
      setSelectedPlan(null);
    } catch (error) {
      toast.error("Erro ao solicitar plano. Tente novamente.");
    } finally {
      setRequesting(false);
    }
  };

  const handleDirectPayment = (plan: PlanCatalog) => {
    // Aqui você integraria com o gateway de pagamento
    toast.info("Redirecionando para pagamento...");
    // window.open(plan.checkoutUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolha seu Plano</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {availablePlans.map((plan) => {
            const planIcon = getPlanIcon(plan.icon || 'crown');
            const isSelected = selectedPlan?.id === plan.id;
            
            return (
              <Card 
                key={plan.id} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-primary shadow-lg' : ''
                } ${plan.highlighted ? 'border-primary border-2' : ''}`}
                onClick={() => handlePlanSelect(plan)}
              >
                <CardHeader className="text-center pb-2">
                  {plan.highlighted && (
                    <Badge className="w-fit mx-auto mb-2 bg-primary">
                      Mais Popular
                    </Badge>
                  )}
                  <div className="flex justify-center mb-2">
                    <planIcon.icon className={`h-12 w-12 ${planIcon.color}`} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-primary">
                    {plan.currency} {Number(plan.price).toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    por {plan.interval === 'monthly' ? 'mês' : plan.interval === 'quarterly' ? 'trimestre' : 'ano'}
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {plan.description && (
                    <p className="text-sm text-muted-foreground text-center">
                      {plan.description}
                    </p>
                  )}
                  
                  <Separator />
                  
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Inclui:</h4>
                      <ul className="space-y-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="pt-4 space-y-2">
                    <Button 
                      className={`w-full ${isSelected ? 'bg-primary' : 'bg-secondary'}`}
                      variant={isSelected ? "default" : "secondary"}
                      onClick={() => handlePlanSelect(plan)}
                    >
                      {isSelected ? 'Selecionado' : 'Selecionar Plano'}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleDirectPayment(plan)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar Agora
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {availablePlans.length === 0 && (
          <div className="text-center py-12">
            <Crown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum plano disponível</h3>
            <p className="text-muted-foreground">
              O professor ainda não criou planos disponíveis para assinatura.
            </p>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          
          {selectedPlan && (
            <Button 
              onClick={handleRequestSubscription}
              disabled={requesting}
            >
              {requesting ? 'Enviando...' : 'Solicitar Plano'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}