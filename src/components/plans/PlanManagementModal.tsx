import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  DollarSign,
  Settings,
  CreditCard,
  BookOpen,
  Dumbbell,
  Utensils,
  Lock,
  Unlock,
  CheckCircle,
  Wallet,
  Globe,
  BarChart3,
  AlertCircle,
  Copy,
  ExternalLink,
  Zap,
  FileText,
  Loader2
} from "lucide-react";
import { PlanCatalog, PlanSubscription } from "@/hooks/usePlans";
import { useGlobalPaymentSettings } from "@/hooks/useGlobalPaymentSettings";
import { useServicePricing } from "@/hooks/useServicePricing";
import { usePaymentProcessing } from "@/hooks/usePaymentProcessing";
import { toast } from "sonner";

interface PlanManagementModalProps {
  plan: PlanCatalog | null;
  subscriptions: PlanSubscription[];
  isOpen: boolean;
  onClose: () => void;
  onUpdatePlan: (planId: string, updates: Partial<PlanCatalog>) => Promise<void>;
}

export function PlanManagementModal({
  plan,
  subscriptions,
  isOpen,
  onClose,
  onUpdatePlan
}: PlanManagementModalProps) {
  console.log('Rendering PlanManagementModal', { isOpen, planId: plan?.id });
  const [saving, setSaving] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [contentAccess, setContentAccess] = useState({
    courses: true,
    workouts: true,
    diets: true,
    assessments: false
  });
  const [allowedMethods, setAllowedMethods] = useState<string[]>(['pix', 'credit_card', 'boleto']);
  const [savingMethods, setSavingMethods] = useState(false);

  // Payment configuration state
  const [paymentConfig, setPaymentConfig] = useState({
    gateway: '',
    methods: [],
    credentials: {
      mercadopago: { accessToken: '', publicKey: '' },
      pagbank: { token: '', publicKey: '' },
      stripe: { secretKey: '', publicKey: '' }
    }
  });

  // Hooks for payment integration
  const { settings: paymentSettings, loading: paymentLoading } = useGlobalPaymentSettings();
  const { services, createService, updateService, loading: serviceLoading } = useServicePricing();
  const { getPaymentMetrics, loading: metricsLoading } = usePaymentProcessing();

  // Payment metrics state
  const [paymentMetrics, setPaymentMetrics] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    transactions: 0,
    conversionRate: 0
  });

  // Load existing settings
  useEffect(() => {
    if (paymentSettings) {
      // Ensure proper credential structure with fallbacks
      const dbCredentials = paymentSettings.credentials || {};
      const safeMercadoPagoCredentials = {
        accessToken: dbCredentials.api_key || dbCredentials.access_token || '',
        publicKey: dbCredentials.public_key || ''
      };

      setPaymentConfig(prev => ({
        ...prev,
        gateway: paymentSettings.gateway_type || '',
        credentials: {
          ...prev.credentials,
          mercadopago: safeMercadoPagoCredentials,
          pagbank: {
            token: dbCredentials.pagbank_token || '',
            publicKey: dbCredentials.pagbank_public_key || ''
          },
          stripe: {
            secretKey: dbCredentials.stripe_secret_key || '',
            publicKey: dbCredentials.stripe_public_key || ''
          }
        }
      }));
    }
  }, [paymentSettings]);

  // Load payment metrics and allowed methods
  useEffect(() => {
    if (plan && isOpen) {
      loadPaymentMetrics();
      loadAllowedMethods();
    }
  }, [plan, isOpen]);

  const loadAllowedMethods = async () => {
    try {
      // Use current gateway or default to mercadopago if none selected
      const gateway = paymentConfig.gateway || 'mercadopago';

      const { data, error } = await supabase
        .from('system_payment_config')
        .select('allowed_payment_methods')
        .eq('gateway_type', gateway)
        .maybeSingle();

      if (data?.allowed_payment_methods) {
        const methods = data.allowed_payment_methods as string[];
        setAllowedMethods(methods);
      } else {
        // If no config found for this gateway, reset or keep defaults
        setAllowedMethods([]);
      }
    } catch (error) {
      console.error('Error loading allowed methods:', error);
    }
  };

  // Reload methods when gateway changes
  useEffect(() => {
    if (paymentConfig.gateway) {
      loadAllowedMethods();
    }
  }, [paymentConfig.gateway]);

  const loadPaymentMetrics = async () => {
    try {
      const metrics = await getPaymentMetrics();
      if (metrics) {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlyRevenue = metrics.revenue_by_month?.[currentMonth] || 0;
        const totalTransactions = metrics.paid_transactions + metrics.pending_transactions + metrics.failed_transactions;
        const conversionRate = totalTransactions > 0 ? (metrics.paid_transactions / totalTransactions) * 100 : 0;

        setPaymentMetrics({
          totalRevenue: metrics.total_revenue || 0,
          monthlyRevenue: monthlyRevenue,
          transactions: totalTransactions,
          conversionRate: conversionRate
        });
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    }
  };

  if (!plan) return null;

  const planSubscriptions = subscriptions.filter(s => s.plan_id === plan.id);
  const activeSubscriptions = planSubscriptions.filter(s => s.status === 'active');
  const pendingSubscriptions = planSubscriptions.filter(s => s.status === 'pending');
  const monthlyRevenue = activeSubscriptions.length * Number(plan.price);

  const handleContentAccessChange = async (contentType: string, enabled: boolean) => {
    setContentAccess(prev => ({ ...prev, [contentType]: enabled }));
    // Aqui você implementaria a lógica para salvar as permissões de conteúdo
  };

  const handlePlanToggle = async () => {
    try {
      setSaving(true);
      await onUpdatePlan(plan.id, { is_active: !plan.is_active });
    } catch (error) {
      console.error('Erro ao alterar status do plano:', error);
    } finally {
      setSaving(false);
    }
  };

  const startEditingPrice = () => {
    setNewPrice(Number(plan.price).toFixed(2));
    setEditingPrice(true);
  };

  const cancelEditingPrice = () => {
    setEditingPrice(false);
    setNewPrice('');
  };

  const savePrice = async () => {
    try {
      setSaving(true);
      await onUpdatePlan(plan.id, { price: Number(newPrice) });

      // Update service pricing - using available service types
      const existingService = services.find(s => s.service_type === 'consultation');
      if (existingService) {
        await updateService(existingService.id, { price: Number(newPrice) });
      } else {
        await createService({
          service_type: 'consultation',
          name: plan.name,
          description: plan.description || '',
          price: Number(newPrice),
          currency: plan.currency || 'BRL',
          is_active: true
        });
      }

      setEditingPrice(false);
      toast.success('Preço atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar preço:', error);
      toast.error('Erro ao atualizar preço');
    } finally {
      setSaving(false);
    }
  };

  const handleGatewayChange = (gateway: string) => {
    setPaymentConfig(prev => ({ ...prev, gateway }));
  };

  const handleCredentialChange = (gateway: string, field: string, value: string) => {
    setPaymentConfig(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [gateway]: {
          ...prev.credentials[gateway],
          [field]: value
        }
      }
    }));
  };

  const savePaymentSettings = async () => {
    toast.error('Este componente está obsoleto. Configure o sistema globalmente em /admin/payment-config')
  }

  const generateCheckoutUrl = () => {
    if (!plan) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/checkout/${plan.id}`;
  };

  const copyCheckoutUrl = () => {
    navigator.clipboard.writeText(generateCheckoutUrl());
    toast.success('URL copiada para a área de transferência!');
  };

  const handleTogglePaymentMethod = (methodId: string) => {
    setAllowedMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(m => m !== methodId)
        : [...prev, methodId]
    );
  };

  const saveAllowedMethods = async () => {
    if (allowedMethods.length === 0) {
      toast.error('Selecione pelo menos um método de pagamento');
      return;
    }

    if (!paymentConfig.gateway) {
      toast.error('Selecione um gateway de pagamento primeiro');
      return;
    }

    try {
      setSavingMethods(true);

      // Check if config exists first
      const { data: existingConfig } = await supabase
        .from('system_payment_config')
        .select('id')
        .eq('gateway_type', paymentConfig.gateway)
        .maybeSingle();

      let error;

      if (existingConfig) {
        const { error: updateError } = await supabase
          .from('system_payment_config')
          .update({
            allowed_payment_methods: allowedMethods,
            updated_at: new Date().toISOString()
          })
          .eq('gateway_type', paymentConfig.gateway);
        error = updateError;
      } else {
        // Create new config if doesn't exist
        const { error: insertError } = await supabase
          .from('system_payment_config')
          .insert({
            gateway_type: paymentConfig.gateway,
            allowed_payment_methods: allowedMethods,
            is_active: true
          });
        error = insertError;
      }

      if (error) throw error;

      toast.success(`${allowedMethods.length} método(s) de pagamento configurado(s)`);
    } catch (error) {
      console.error('Error saving methods:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingMethods(false);
    }
  };

  const paymentMethodsConfig = [
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
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-6 w-6 text-primary" />
            Gerenciar Plano: {plan.name}
          </DialogTitle >
        </DialogHeader >

        <Tabs defaultValue="overview" className="w-full" onValueChange={(val) => console.log('Tab changed to:', val)}>
          <div className="px-6 pt-6">
            <TabsList className="grid w-full grid-cols-4 h-11">
              <TabsTrigger value="overview" className="text-sm">Visão Geral</TabsTrigger>
              <TabsTrigger value="subscribers" className="text-sm">Assinantes</TabsTrigger>
              <TabsTrigger value="content" className="text-sm">Conteúdo</TabsTrigger>
              <TabsTrigger value="payments" className="text-sm">Pagamentos</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{activeSubscriptions.length}</p>
                        <p className="text-sm text-muted-foreground font-medium">Assinantes Ativos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-success/10 rounded-full">
                        <DollarSign className="h-8 w-8 text-success" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold">R$ {monthlyRevenue.toFixed(0)}</p>
                        <p className="text-sm text-muted-foreground font-medium">Receita Mensal</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-warning/10 rounded-full">
                        <CheckCircle className="h-8 w-8 text-warning" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{pendingSubscriptions.length}</p>
                        <p className="text-sm text-muted-foreground font-medium">Pendentes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardHeader className="p-6 pb-4 border-b border-border">
                  <CardTitle className="text-lg">Configurações do Plano</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                    <div>
                      <Label className="text-base font-medium">Status do Plano</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.is_active ? 'Plano disponível para novos assinantes' : 'Plano indisponível para novos assinantes'}
                      </p>
                    </div>
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={handlePlanToggle}
                      disabled={saving}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-base font-medium">Preço</Label>
                        {!editingPrice && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={startEditingPrice}
                            disabled={saving}
                            className="h-8"
                          >
                            Editar
                          </Button>
                        )}
                      </div>
                      {editingPrice ? (
                        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium bg-background px-3 py-2 rounded border border-border">{plan.currency}</span>
                            <Input
                              type="number"
                              value={newPrice}
                              onChange={(e) => setNewPrice(e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              className="w-32"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={savePrice} disabled={saving}>
                              Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditingPrice}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                          <div className="text-3xl font-bold text-primary">
                            {plan.currency} {Number(plan.price).toFixed(2)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            por {plan.interval === 'monthly' ? 'mês' : plan.interval === 'quarterly' ? 'trimestre' : 'ano'}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-base font-medium mb-3 block">Recursos Inclusos</Label>
                      <div className="p-4 bg-muted/30 rounded-lg border border-border min-h-[100px]">
                        <div className="text-sm text-muted-foreground leading-relaxed">
                          {Array.isArray(plan.features) && plan.features.length > 0
                            ? plan.features.join(", ")
                            : "Nenhum recurso definido"
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscribers" className="mt-0 space-y-6">
              <div className="space-y-6">
                {pendingSubscriptions.length > 0 && (
                  <Card className="border-warning/50 shadow-sm">
                    <CardHeader className="p-6 pb-4 border-b border-border bg-warning/5">
                      <CardTitle className="flex items-center gap-2 text-warning text-lg">
                        <CheckCircle className="h-5 w-5" />
                        Solicitações Pendentes ({pendingSubscriptions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {pendingSubscriptions.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg bg-background hover:bg-accent/5 transition-colors">
                            <div>
                              <p className="font-medium">Usuário: {sub.student_user_id.slice(0, 8)}...</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Solicitado em {new Date(sub.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">Rejeitar</Button>
                              <Button size="sm" className="bg-success hover:bg-success/90">Aprovar</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-sm">
                  <CardHeader className="p-6 pb-4 border-b border-border">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-primary" />
                      Assinantes Ativos ({activeSubscriptions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {activeSubscriptions.length === 0 ? (
                      <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                        <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">
                          Nenhum assinante ativo ainda
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeSubscriptions.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                            <div>
                              <p className="font-medium">Usuário: {sub.student_user_id.slice(0, 8)}...</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Ativo desde {sub.start_at ? new Date(sub.start_at).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <Badge variant="default" className="bg-success hover:bg-success/90">Ativo</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="content" className="mt-0 space-y-6">
              <Card className="shadow-sm">
                <CardHeader className="p-6 pb-4 border-b border-border">
                  <CardTitle className="text-lg">Controle de Acesso ao Conteúdo</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Defina quais conteúdos os assinantes deste plano podem acessar
                  </p>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <Label className="text-base font-medium cursor-pointer">Cursos</Label>
                        <p className="text-sm text-muted-foreground mt-0.5">Acesso a todos os cursos</p>
                      </div>
                    </div>
                    <Switch
                      checked={contentAccess.courses}
                      onCheckedChange={(checked) => handleContentAccessChange('courses', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Dumbbell className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <Label className="text-base font-medium cursor-pointer">Treinos</Label>
                        <p className="text-sm text-muted-foreground mt-0.5">Planos de treino personalizados</p>
                      </div>
                    </div>
                    <Switch
                      checked={contentAccess.workouts}
                      onCheckedChange={(checked) => handleContentAccessChange('workouts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Utensils className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <Label className="text-base font-medium cursor-pointer">Dietas</Label>
                        <p className="text-sm text-muted-foreground mt-0.5">Planos nutricionais</p>
                      </div>
                    </div>
                    <Switch
                      checked={contentAccess.diets}
                      onCheckedChange={(checked) => handleContentAccessChange('diets', checked)}
                    />
                  </div>

                </CardContent>
              </Card>

              {/* Checkout Configuration */}
              <Card className="shadow-sm">
                <CardHeader className="p-6 pb-4 border-b border-border">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Globe className="h-5 w-5" />
                    URLs de Checkout
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label className="text-base font-medium mb-2 block">URL de Checkout do Plano</Label>
                    <div className="flex gap-3">
                      <Input
                        value={generateCheckoutUrl()}
                        readOnly
                        className="flex-1 h-11 bg-muted/30"
                      />
                      <Button variant="outline" size="icon" onClick={copyCheckoutUrl} className="h-11 w-11 shrink-0">
                        <Copy className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="icon" asChild className="h-11 w-11 shrink-0">
                        <a href={generateCheckoutUrl()} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Link direto para os alunos adquirirem este plano
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="mt-0 space-y-6">
              {/* Payment Statistics */}
              <Card className="shadow-sm">
                <CardHeader className="p-6 pb-4 border-b border-border">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5" />
                    Estatísticas de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-6 border rounded-xl bg-muted/10">
                      <p className="text-3xl font-bold text-primary mb-1">
                        R$ {paymentMetrics.monthlyRevenue.toFixed(0)}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">Receita Mensal</p>
                    </div>
                    <div className="text-center p-6 border rounded-xl bg-muted/10">
                      <p className="text-3xl font-bold text-success mb-1">
                        R$ {paymentMetrics.totalRevenue.toFixed(0)}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">Receita Total</p>
                    </div>
                    <div className="text-center p-6 border rounded-xl bg-muted/10">
                      <p className="text-3xl font-bold text-warning mb-1">
                        {paymentMetrics.transactions}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">Transações</p>
                    </div>
                    <div className="text-center p-6 border rounded-xl bg-muted/10">
                      <p className="text-3xl font-bold text-accent mb-1">
                        {paymentMetrics.conversionRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">Taxa Conversão</p>
                    </div>
                  </div>

                  <div className="mt-6 p-6 border rounded-xl bg-muted/30">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-warning" />
                      Projeções
                    </h4>
                    <div className="grid grid-cols-3 gap-8 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground mb-1">Anual</span>
                        <span className="text-lg font-bold">
                          R$ {(paymentMetrics.monthlyRevenue * 12).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground mb-1">Ticket Médio</span>
                        <span className="text-lg font-bold">
                          R$ {Number(plan?.price || 0).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground mb-1">Assinantes</span>
                        <span className="text-lg font-bold">
                          {activeSubscriptions.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="p-6 pb-4 border-b border-border">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5" />
                    Métodos de Pagamento Aceitos
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Selecione quais métodos de pagamento estarão disponíveis para este plano
                  </p>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {paymentMethodsConfig.map((method) => {
                      const isSelected = allowedMethods.includes(method.id);
                      return (
                        <div
                          key={method.id}
                          className={`
                            relative p-6 border rounded-xl cursor-pointer transition-all duration-200
                            ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50 hover:bg-accent/5'}
                          `}
                          onClick={() => handleTogglePaymentMethod(method.id)}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                              <method.icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleTogglePaymentMethod(method.id)}
                              className="h-5 w-5"
                            />
                          </div>
                          <h3 className="font-bold text-lg mb-1">{method.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{method.description}</p>
                          <Badge variant="outline" className="text-xs font-normal">
                            {method.processingTime}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button onClick={saveAllowedMethods} disabled={savingMethods} size="lg" className="min-w-[200px]">
                      {savingMethods && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Configurações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}