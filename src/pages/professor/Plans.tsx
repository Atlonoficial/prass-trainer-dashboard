import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlanForm } from "@/components/plans/PlanForm";
import { usePlans } from "@/hooks/usePlans";
import { getPlanIcon } from "@/components/plans/PlanIconSelector";
import { PlanManagementModal } from "@/components/plans/PlanManagementModal";
import { Check, Plus, UserCheck, Edit, Trash2, TrendingUp, Users, DollarSign, Settings, Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ProfessorPlansPage() {
  const { isTeacher, plans, subscriptions, createPlan, updatePlan, approveSubscription, loading } = usePlans();
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedManagementPlan, setSelectedManagementPlan] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!isTeacher) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Planos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Apenas professores podem gerenciar planos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcular métricas
  const metrics = useMemo(() => {
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending');
    const totalRevenue = plans.reduce((sum, plan) => {
      const planSubs = activeSubscriptions.filter(s => s.plan_id === plan.id);
      return sum + (planSubs.length * Number(plan.price));
    }, 0);
    
    return {
      totalPlans: plans.length,
      activePlans: plans.filter(p => p.is_active).length,
      totalSubscriptions: activeSubscriptions.length,
      pendingRequests: pendingSubscriptions.length,
      monthlyRevenue: totalRevenue
    };
  }, [plans, subscriptions]);

  const handleCreateOrUpdate = async (payload: any) => {
    try {
      setSaving(true);
      if (editingPlan) {
        await updatePlan(editingPlan.id, payload);
        toast.success("Plano atualizado com sucesso");
      } else {
        await createPlan(payload);
        toast.success("Plano criado com sucesso");
      }
      setOpen(false);
      setEditingPlan(null);
    } catch (e: any) {
      toast.error(e.message || (editingPlan ? "Erro ao atualizar plano" : "Erro ao criar plano"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setOpen(true);
  };

  const handleToggleStatus = async (plan: any) => {
    try {
      await updatePlan(plan.id, { is_active: !plan.is_active });
      toast.success(plan.is_active ? "Plano desativado" : "Plano ativado");
    } catch (e: any) {
      toast.error("Erro ao alterar status do plano");
    }
  };

  const getSubscriberCount = (planId: string) => {
    return subscriptions.filter(s => s.plan_id === planId && s.status === 'active').length;
  };

  const handleApprove = async (id: string) => {
    try {
      await approveSubscription(id);
      toast.success("Assinatura aprovada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao aprovar");
    }
  };

  return (
    <main className="container mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestão de Planos</h1>
        <Dialog open={open} onOpenChange={(open) => {
          setOpen(open);
          if (!open) {
            setEditingPlan(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Editar Plano" : "Criar Novo Plano"}</DialogTitle>
            </DialogHeader>
            <PlanForm 
              initial={editingPlan} 
              onSubmit={handleCreateOrUpdate} 
              submitting={saving} 
            />
          </DialogContent>
        </Dialog>
      </header>

      {/* Métricas Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalPlans}</p>
                <p className="text-xs text-muted-foreground">Total de Planos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{metrics.activePlans}</p>
                <p className="text-xs text-muted-foreground">Planos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-info" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalSubscriptions}</p>
                <p className="text-xs text-muted-foreground">Assinantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">{metrics.pendingRequests}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">R$ {metrics.monthlyRevenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Receita Mensal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Meus Planos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const subscriberCount = getSubscriberCount(plan.id);
            const planIcon = getPlanIcon(plan.icon || 'crown');
            
            return (
              <Card key={plan.id} className={`relative ${plan.highlighted ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <planIcon.icon className={`h-5 w-5 ${planIcon.color}`} />
                      <span>{plan.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.is_active ? (
                        <Badge variant="default">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(plan)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(plan)}>
                            {plan.is_active ? (
                              <>
                                <Settings className="h-4 w-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <Settings className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {plan.description || "Sem descrição"}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary">
                      {plan.currency} {Number(plan.price).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      / {plan.interval === 'monthly' ? 'mês' : plan.interval === 'quarterly' ? 'trimestre' : 'ano'}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{subscriberCount} assinante{subscriberCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-success" />
                      <span className="text-success font-medium">
                        R$ {(subscriberCount * Number(plan.price)).toFixed(0)}/mês
                      </span>
                    </div>
                  </div>

                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Inclui:</strong> {plan.features.join(", ")}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setSelectedManagementPlan(plan)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Configurar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {plans.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhum plano criado</h3>
                <p className="text-muted-foreground mb-4">Crie seu primeiro plano para começar a receber assinantes</p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Plano
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Solicitações Pendentes</h2>
        <div className="space-y-3">
          {subscriptions.filter((s) => s.status === "pending").map((s) => (
            <Card key={s.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">Assinatura pendente</div>
                  <div className="text-muted-foreground">Aluno: {s.student_user_id.slice(0, 8)}... • Criado em {new Date(s.created_at).toLocaleString()}</div>
                </div>
                <Button size="sm" onClick={() => handleApprove(s.id)} disabled={loading}>
                  <UserCheck className="h-4 w-4 mr-2" /> Aprovar
                </Button>
              </CardContent>
            </Card>
          ))}
          {subscriptions.filter((s) => s.status === "pending").length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Sem solicitações no momento.</CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Assinaturas Ativas</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {subscriptions.filter((s) => s.status === "active").map((s) => (
            <Card key={s.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium flex items-center gap-2">
                      <Check className="h-4 w-4" /> Ativa
                    </div>
                    <div className="text-muted-foreground">Aluno: {s.student_user_id.slice(0, 8)}...</div>
                    <div className="text-muted-foreground">Início: {s.start_at ? new Date(s.start_at).toLocaleDateString() : '-'}</div>
                    <div className="text-muted-foreground">Fim: {s.end_at ? new Date(s.end_at).toLocaleDateString() : '-'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {subscriptions.filter((s) => s.status === "active").length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Sem assinaturas ativas.</CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Modal de Gerenciamento de Plano */}
      <PlanManagementModal
        plan={selectedManagementPlan}
        subscriptions={subscriptions}
        isOpen={!!selectedManagementPlan}
        onClose={() => setSelectedManagementPlan(null)}
        onUpdatePlan={async (planId, updates) => {
          await updatePlan(planId, updates);
        }}
      />
    </main>
  );
}
