import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Star, FileText, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { usePlans } from '@/hooks/usePlans';
import { useStudents } from '@/hooks/useStudents';
import { useAppointments } from '@/hooks/useAppointments';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlanValidator } from '@/components/payments/PlanValidator';
import { getExpirationDisplay } from '@/lib/studentUtils';
import { PlanForm } from '@/components/plans/PlanForm';
import { getPlanIcon } from '@/components/plans/PlanIconSelector';
import { PlanManagementModal } from '@/components/plans/PlanManagementModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Check, X, MoreHorizontal, Settings, Edit, Power, PowerOff, Trash2, Eye } from 'lucide-react';
import { EvaluationsOverview } from '@/components/consulting/EvaluationsOverview';
import { StudentFilters } from '@/components/consulting/StudentFilters';
import { StudentsTable } from '@/components/consulting/StudentsTable';
import { StudentDetailView } from '@/components/consulting/StudentDetailView';
import { Badge } from '@/components/ui/badge';

interface Student {
  id: number;
  name: string;
  email: string;
  plan: string;
  modality: string;
  daysRemaining: number;
  status: 'active' | 'inactive' | 'free';
  age: number;
  height: string;
  weight: string;
}

interface ConsultingSectionProps {
  subSection?: string;
}

export default function ConsultingSection({ subSection }: ConsultingSectionProps) {
  const [activeTab, setActiveTab] = useState(subSection || 'consultorias');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Filter states
  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [planFilter, setPlanFilter] = useState('todos');
  const [modalityFilter, setModalityFilter] = useState('todos');
  
  // Modal states
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [managingPlan, setManagingPlan] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);

  // Hooks
  const { isTeacher, plans: membershipPlans, subscriptions, createPlan, updatePlan, deletePlan, loading: plansLoading } = usePlans();
  const { students: rawStudents, loading: studentsLoading, refetch: refetchStudents } = useStudents();
  const { addNotification } = useNotifications();
  const { addAppointment, deleteFutureAppointments, refetch: refetchAppointments } = useAppointments();
  const { user } = useAuth();

  // Plan management functions
  const handleTogglePlan = async (planId: string, isActive: boolean) => {
    try {
      setSaving(true);
      await updatePlan(planId, { is_active: isActive });
      toast.success(isActive ? 'Plano ativado com sucesso' : 'Plano desativado com sucesso');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar status do plano');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCheckout = async (planId: string) => {
    try {
      setSaving(true);
      console.log('[ConsultingSection] Creating checkout for plan:', planId);
      
      const { usePaymentProcessing } = await import('@/hooks/usePaymentProcessing');
      const { createCheckout } = usePaymentProcessing();
      
      // Usar plan_id corretamente para o novo sistema
      const result = await createCheckout(planId, null, 'pix');
      
      if (result.checkout_url) {
        window.open(result.checkout_url, '_blank');
        toast.success('Redirecionando para pagamento...');
      } else {
        toast.error('URL de pagamento não retornada');
      }
    } catch (error: any) {
      console.error('[ConsultingSection] Checkout error:', error);
      toast.error(`Erro no checkout: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      setSaving(true);
      await deletePlan(planId);
      toast.success('Plano excluído com sucesso');
      setDeletingPlan(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir plano');
    } finally {
      setSaving(false);
    }
  };

  // Student interaction functions
  const handleOpenWhatsApp = () => {
    if (!selectedStudent) return;
    
    const studentData = rawStudents?.find((s: any) => 
      s.name === selectedStudent.name || 
      s.email === selectedStudent.email
    );
    
    const phoneNumber = studentData?.phone;
    
    if (!phoneNumber) {
      toast.error('Este aluno não possui número de WhatsApp cadastrado.');
      return;
    }
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}`;
    
    window.open(whatsappUrl, '_blank');
    toast.success('Redirecionando para conversa no WhatsApp...');
  };

  const handleOpenChat = () => {
    if (!selectedStudent) return;
    window.location.href = '/?section=comunicacao';
    toast.success('Redirecionando para conversa interna...');
  };

  const getSelectedStudentUserId = () => {
    if (!selectedStudent) return null;
    const studentData = rawStudents.find(s => s.name === selectedStudent.name);
    return studentData?.user_id || null;
  };

  // Appointment functions with loading states
  const handleSaveAppointment = async (appointment: any) => {
    try {
      setAppointmentLoading(true);
      const studentUserId = getSelectedStudentUserId();
      if (!studentUserId) {
        toast.error('Dados do aluno não encontrados');
        return;
      }

      if (!user?.id) {
        toast.error('Usuário não autenticado');
        return;
      }

      const appointmentDate = new Date(appointment.date);
      const [hours, minutes] = appointment.time.split(':').map(Number);
      appointmentDate.setHours(hours, minutes, 0, 0);

      await addAppointment({
        title: appointment.service || 'Agendamento',
        description: appointment.objective,
        student_id: studentUserId,
        teacher_id: user.id,
        scheduled_time: appointmentDate.toISOString(),
        duration: parseInt(appointment.duration),
        type: appointment.service,
        location: appointment.academy,
        notes: appointment.notes,
        status: appointment.status || 'pending'
      });
      
      toast.success('Agendamento criado com sucesso');
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      toast.error(error.message || 'Erro ao criar agendamento');
    } finally {
      setAppointmentLoading(false);
    }
  };

  const handleSavePeriodAppointments = async (appointments: any[]) => {
    try {
      setAppointmentLoading(true);
      const studentUserId = getSelectedStudentUserId();
      if (!studentUserId) {
        toast.error('Dados do aluno não encontrados');
        return;
      }

      if (!user?.id) {
        toast.error('Usuário não autenticado');
        return;
      }

      let successCount = 0;
      for (const appointment of appointments) {
        try {
          await addAppointment({
            title: appointment.service || 'Agendamento',
            description: appointment.objective,
            student_id: studentUserId,
            teacher_id: user.id,
            scheduled_time: new Date(appointment.date).toISOString(),
            duration: parseInt(appointment.duration),
            type: appointment.service,
            location: appointment.academy,
            notes: appointment.notes,
            status: appointment.status || 'pending'
          });
          successCount++;
        } catch (error) {
          console.error('Erro ao criar agendamento individual:', error);
        }
      }
      
      if (successCount === appointments.length) {
        toast.success(`${successCount} agendamentos criados com sucesso`);
      } else if (successCount > 0) {
        toast.success(`${successCount} de ${appointments.length} agendamentos criados com sucesso`);
      } else {
        toast.error('Nenhum agendamento foi criado');
      }
    } catch (error: any) {
      console.error('Erro ao criar agendamentos:', error);
      toast.error(error.message || 'Erro ao criar agendamentos');
    } finally {
      setAppointmentLoading(false);
    }
  };

  const handleDeleteFutureAppointments = async () => {
    if (!selectedStudent) return;
    
    const studentUserId = getSelectedStudentUserId();
    if (!studentUserId) {
      toast.error('ID do aluno não encontrado');
      return;
    }
    
    try {
      setAppointmentLoading(true);
      await deleteFutureAppointments(studentUserId);
      toast.success('Agendamentos futuros excluídos com sucesso');
    } catch (error: any) {
      console.error('Erro ao excluir agendamentos futuros:', error);
      toast.error(error.message || 'Erro ao excluir agendamentos futuros');
    } finally {
      setAppointmentLoading(false);
    }
  };

  const handleRefreshAppointments = () => {
    refetchAppointments?.();
    refetchStudents?.();
  };

  // Transform raw students data
  const students: Student[] = rawStudents.map(student => {
    const studentSubscriptions = subscriptions?.filter(sub => 
      sub.student_user_id === student.user_id
    ) || [];

    const activeSubscription = studentSubscriptions.find(sub => 
      sub.status === 'active' &&
      (sub.end_at === null || new Date(sub.end_at) > new Date())
    );

    const hasEverHadSubscription = studentSubscriptions.length > 0;
    const plan = activeSubscription ? membershipPlans?.find(p => p.id === activeSubscription.plan_id) : null;

    // Calculate days remaining based on student membership_expiry
    const expirationDate = student.membership_expiry;
    const daysRemaining = expirationDate 
      ? Math.max(0, Math.ceil((new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const modality = student.mode || 'Não informado';

    let status: 'active' | 'inactive' | 'free';
    if (activeSubscription) {
      status = 'active';
    } else if (hasEverHadSubscription) {
      status = 'inactive';
    } else {
      status = 'free';
    }

    return {
      id: parseInt(student.id.replace(/-/g, '').substring(0, 8), 16),
      name: student.name,
      email: student.email,
      plan: plan?.name || student.plan || 'Sem plano',
      modality,
      daysRemaining,
      status,
      age: 25,
      height: '1.75m',
      weight: '70kg',
    };
  }).filter(student => {
    // Only show students with paid subscriptions (active or inactive)
    return (student.status === 'active' || student.status === 'inactive') && 
           student.plan !== 'Sem plano' && 
           student.plan !== 'free';
  });

  // Apply filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchName.toLowerCase()) &&
                         student.email.toLowerCase().includes(searchEmail.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || 
                         (statusFilter === 'ativos' && student.status === 'active') ||
                         (statusFilter === 'inativos' && student.status === 'inactive');
    const matchesPlan = planFilter === 'todos' || student.plan === planFilter;
    const matchesModality = modalityFilter === 'todos' || student.modality.includes(modalityFilter);
    
    return matchesSearch && matchesStatus && matchesPlan && matchesModality;
  });

  // Clear filters
  const handleClearFilters = () => {
    setSearchName('');
    setSearchEmail('');
    setStatusFilter('todos');
    setPlanFilter('todos');
    setModalityFilter('todos');
  };

  // Student selection
  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
  };

  const handleBackToList = () => {
    setSelectedStudent(null);
  };

  // Statistics
  const activeStudents = students.filter(s => s.status === 'active').length;
  const inactiveStudents = students.filter(s => s.status === 'inactive').length;

  const renderContent = () => {
    if (selectedStudent) {
      return (
        <StudentDetailView
          student={selectedStudent}
          onBack={handleBackToList}
          onOpenWhatsApp={handleOpenWhatsApp}
          onOpenChat={handleOpenChat}
          rawStudents={rawStudents}
          getSelectedStudentUserId={getSelectedStudentUserId}
        />
      );
    }

    switch(activeTab) {
      case 'consultorias':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-foreground">Consultorias</h1>
                <p className="text-muted-foreground text-xs">Gerencie seus alunos em consultoria</p>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span className="text-muted-foreground">Ativos: {activeStudents}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-warning rounded-full"></div>
                  <span className="text-muted-foreground">Inativos: {inactiveStudents}</span>
                </div>
              </div>
            </div>

            <StudentFilters
              searchName={searchName}
              onSearchNameChange={setSearchName}
              searchEmail={searchEmail}
              onSearchEmailChange={setSearchEmail}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              planFilter={planFilter}
              onPlanFilterChange={setPlanFilter}
              modalityFilter={modalityFilter}
              onModalityFilterChange={setModalityFilter}
              onClearFilters={handleClearFilters}
            />

            <StudentsTable
              students={filteredStudents}
              onStudentClick={handleStudentClick}
              showActions={false}
            />
          </div>
        );

      case 'feedbacks':
        return <EvaluationsOverview type="feedbacks" />;

      case 'planos':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Planos de Consultoria</h3>
              <Button 
                onClick={() => setIsNewPlanModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Novo Plano
              </Button>
            </div>
            {(membershipPlans || []).map((p) => {
              const planIcon = getPlanIcon(p.icon || 'crown');
              const IconComponent = planIcon.icon;
              
              return (
                <Card key={p.id} className="bg-gradient-to-br from-card to-card/80 border-border p-2 sm:p-3 hover:shadow-lg transition-all">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className={`p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-background to-muted border-2 border-border`}>
                      <IconComponent className={`h-5 w-5 sm:h-6 sm:w-6 ${planIcon.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm sm:text-base font-bold text-foreground">{p.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={p.is_active ? "bg-success text-white" : "bg-muted text-muted-foreground"}>
                            {p.is_active ? 'ATIVO' : 'INATIVO'}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setManagingPlan(p)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Gerenciar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingPlan(p)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleTogglePlan(p.id, !p.is_active)}
                                className={p.is_active ? "text-warning" : "text-success"}
                              >
                                {p.is_active ? (
                                  <>
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <Power className="h-4 w-4 mr-2" />
                                    Ativar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeletingPlan(p)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-2xl font-bold text-foreground">
                            {p.currency} {Number(p.price).toFixed(2)}
                            <span className="text-sm text-muted-foreground ml-1">
                              / {p.interval === 'monthly' ? 'mês' : 
                                  p.interval === 'quarterly' ? 'trimestre' :
                                  p.interval === 'yearly' ? 'ano' : p.interval}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {subscriptions?.filter(sub => sub.plan_id === p.id && sub.status === 'active').length || 0} assinantes ativos
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {Array.isArray(p.features) && p.features.length > 0 ? (
                          p.features.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-success flex-shrink-0" />
                              <span className="text-sm text-foreground">{feature}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2">
                            <X className="h-4 w-4 text-destructive flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">Sem recursos definidos</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setManagingPlan(p)}
                          className="flex-1"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleCreateCheckout(p.id)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Checkout
                        </Button>
                      </div>

                      {/* Validadores do Plano */}
                      <div className="mt-6">
                        <PlanValidator 
                          plan={p}
                          onTestComplete={(success, errors) => {
                            if (!success) {
                              console.error('Plano com problemas:', errors)
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  const tabs = [
    { id: 'consultorias', label: 'Consultorias', icon: MessageSquare },
    { id: 'feedbacks', label: 'Feedbacks', icon: Star },
    { id: 'planos', label: 'Planos', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      {!selectedStudent && (
        <>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-success" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Consultoria</h1>
              <p className="text-muted-foreground">Gerencie suas consultorias e relacionamento com clientes</p>
            </div>
          </div>

          {/* Tabs */}
          <Card className="bg-card border-border p-6">
            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      activeTab === tab.id
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {renderContent()}
      
      {/* Modals */}
      <Dialog open={isNewPlanModalOpen} onOpenChange={setIsNewPlanModalOpen}>
        <DialogContent className="max-w-xl bg-card border-border" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Novo Plano</DialogTitle>
          </DialogHeader>
          <PlanForm
            submitting={saving}
            onSubmit={async (payload) => {
              try {
                setSaving(true);
                await createPlan(payload);
                toast.success("Plano criado com sucesso");
                setIsNewPlanModalOpen(false);
              } catch (e: any) {
                toast.error(e.message || "Erro ao criar plano");
              } finally {
                setSaving(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="max-w-xl bg-card border-border" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <PlanForm
              initial={editingPlan}
              submitting={saving}
              onSubmit={async (payload) => {
                try {
                  setSaving(true);
                  await updatePlan((editingPlan as any).id, payload);
                  toast.success("Plano atualizado com sucesso");
                  setEditingPlan(null);
                } catch (e: any) {
                  toast.error(e.message || "Erro ao atualizar plano");
                } finally {
                  setSaving(false);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <PlanManagementModal
        plan={managingPlan}
        subscriptions={subscriptions || []}
        isOpen={!!managingPlan}
        onClose={() => setManagingPlan(null)}
        onUpdatePlan={async (planId, updates) => {
          await updatePlan(planId, updates);
        }}
      />

      <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPlan && handleDeletePlan((deletingPlan as any).id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}