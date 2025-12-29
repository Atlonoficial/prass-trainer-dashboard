import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, MessageSquare, Star, Send, FileText, Users, TrendingDown, Settings, Wrench, Search, Filter, Calendar, ClipboardCheck, Utensils, Dumbbell, Activity, Camera, BookOpen, StickyNote, TrendingUp, Trash2, MoreHorizontal, Eye, Edit, Power, PowerOff, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import TrainingPlanModal from '@/components/training/TrainingPlanModal';
import { getExpirationDisplay } from '@/lib/studentUtils';
import { MealPlanModal } from '@/components/nutrition';
import StudentProfileModal from '@/components/students/StudentProfileModal';
import { StudentAppointmentsList } from '@/components/consulting/StudentAppointmentsList';
import CancelAppointmentModal from '@/components/schedule/CancelAppointmentModal';
import { useNotifications } from '@/hooks/useNotifications';
// Removed useTrainingPlan import to avoid context provider issues
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlanForm } from '@/components/plans/PlanForm';
import { usePlans } from '@/hooks/usePlans';
import { useStudents } from '@/hooks/useStudents';
import { getPlanIcon } from '@/components/plans/PlanIconSelector';
import { PlanManagementModal } from '@/components/plans/PlanManagementModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { usePaymentProcessing } from '@/hooks/usePaymentProcessing';
import { usePaymentValidation } from '@/hooks/usePaymentValidation';
import { PaymentConfigAlert } from '@/components/payments/PaymentConfigAlert';
import { StudentEvaluationsTab } from '@/components/consulting/StudentEvaluationsTab';
import { StudentAnamneseTab } from '@/components/students/StudentAnamneseTab';
import { EvaluationsOverview } from '@/components/consulting/EvaluationsOverview';
import { ProgressTrackingTab } from '@/components/students/ProgressTrackingTab';
import { MealPlansManager } from '@/components/nutrition';
import { StudentTrainingPlansView } from '@/components/training/StudentTrainingPlansView';
import { MedicalExamsTab } from '@/components/students/MedicalExamsTab';
import NewAppointmentModal from '@/components/schedule/NewAppointmentModal';
import PeriodAppointmentModal from '@/components/schedule/PeriodAppointmentModal';
import { useAppointments } from '@/hooks/useAppointments';
import { FeedbacksTab } from '@/components/students/FeedbacksTab';
import { ProgressPhotosTab } from '@/components/students/ProgressPhotosTab';
import { StudentMonitoringTab } from '@/components/consulting/StudentMonitoringTab';

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
  const [activeTab, setActiveTab] = useState(subSection || 'ativas');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentTab, setStudentTab] = useState('agendamentos');
  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [managingPlan, setManagingPlan] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null);

  // Appointment modal states
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showPeriodAppointment, setShowPeriodAppointment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const { isTeacher, plans: membershipPlans, subscriptions, createPlan, updatePlan, deletePlan, loading: plansLoading } = usePlans();
  const { students: rawStudents, loading: studentsLoading } = useStudents();
  const { addNotification } = useNotifications();
  const { addAppointment, deleteFutureAppointments } = useAppointments();
  const { user } = useAuth();
  const { createCheckout, loading: paymentLoading } = usePaymentProcessing();
  const { isPaymentConfigured, getPaymentConfigStatus } = usePaymentValidation();

  // Add missing functions
  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      // Update appointment status logic here
      toast.success('Agendamento confirmado com sucesso');
    } catch (error) {
      toast.error('Erro ao confirmar agendamento');
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
    const appointment = { id: appointmentId }; // Get actual appointment data
    setAppointmentToCancel(appointment);
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async (reason: string, notifyStudent: boolean) => {
    try {
      // Update appointment status with cancellation reason
      if (notifyStudent && appointmentToCancel) {
        await addNotification({
          title: 'Agendamento Cancelado',
          message: `Seu agendamento foi cancelado. Motivo: ${reason}`,
          type: 'warning'
        });
      }
      toast.success('Agendamento cancelado com sucesso');
      setCancelModalOpen(false);
      setAppointmentToCancel(null);
    } catch (error) {
      toast.error('Erro ao cancelar agendamento');
    }
  };

  // Helper functions
  const getActiveSubscribersCount = (planId: string) => {
    return subscriptions?.filter(sub => sub.plan_id === planId && sub.status === 'active').length || 0;
  };

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
      setCheckoutLoading(true);

      // Encontrar o plano
      const plan = membershipPlans?.find(p => p.id === planId);
      if (!plan) {
        toast.error('Plano não encontrado');
        return;
      }

      console.log('[ConsultingSection] Iniciando checkout para plano:', planId);

      // Criar checkout session
      const checkoutData = await createCheckout(plan.id, null, 'pix');

      if (checkoutData?.checkout_url) {
        window.open(checkoutData.checkout_url, '_blank');
        toast.success('Redirecionando para o pagamento...');
      } else {
        toast.error('Erro ao criar sessão de checkout');
      }
    } catch (error: any) {
      console.error('[ConsultingSection] Erro no checkout:', error);

      // Tratamento específico para erro de credenciais
      if (error.message?.includes('API key not configured') ||
        error.message?.includes('credenciais') ||
        error.message?.includes('credentials')) {
        toast.error('Configure suas credenciais do Mercado Pago primeiro', {
          description: 'Acesse Configurações → Sistema de Pagamentos para configurar',
          action: {
            label: 'Configurar Agora',
            onClick: () => window.location.href = '/?section=pagamentos'
          }
        });
      } else {
        toast.error(`Erro no checkout: ${error.message || 'Tente novamente'}`);
      }
    } finally {
      setCheckoutLoading(false);
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

  // Função para abrir WhatsApp do aluno
  const handleOpenWhatsApp = () => {
    if (!selectedStudent) return;

    // Busca por número de telefone nos dados do estudante real
    const studentData = rawStudents.find((s: any) =>
      s.name === selectedStudent.name ||
      s.email === selectedStudent.email
    );

    const phoneNumber = studentData?.phone;

    if (!phoneNumber) {
      toast.error('Este aluno não possui número de WhatsApp cadastrado.');
      return;
    }

    // Remove caracteres especiais e formata para WhatsApp
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}`;

    // Abre em nova aba
    window.open(whatsappUrl, '_blank');

    toast.success('Redirecionando para conversa no WhatsApp...');
  };

  // Função para abrir chat interno
  const handleOpenChat = () => {
    if (!selectedStudent) return;

    // Busca o ID do aluno para abrir conversa específica
    const studentData = rawStudents.find((s: any) =>
      s.name === selectedStudent.name ||
      s.email === selectedStudent.email
    );

    if (!studentData?.user_id) {
      toast.error('Dados do aluno não encontrados.');
      return;
    }

    // Redireciona para a seção de comunicação com o aluno específico
    window.location.href = `/?section=comunicacao&student=${studentData.user_id}`;

    toast.success('Redirecionando para conversa interna...');
  };

  // Helper function to get student user_id
  const getSelectedStudentUserId = () => {
    if (!selectedStudent) return null;
    const studentData = rawStudents.find(s => s.name === selectedStudent.name);
    return studentData?.user_id || null;
  };

  // Appointment handlers
  const handleSingleAppointment = () => {
    if (!selectedStudent) {
      toast.error('Selecione um aluno antes de criar um agendamento');
      return;
    }

    const studentUserId = getSelectedStudentUserId();
    if (!studentUserId) {
      toast.error('Dados do aluno não encontrados');
      return;
    }

    setShowNewAppointment(true);
  };

  const handlePeriodAppointment = () => {
    if (!selectedStudent) {
      toast.error('Selecione um aluno antes de criar agendamentos para período');
      return;
    }

    const studentUserId = getSelectedStudentUserId();
    if (!studentUserId) {
      toast.error('Dados do aluno não encontrados');
      return;
    }

    setShowPeriodAppointment(true);
  };

  const handleDeleteFutureAppointments = () => {
    if (!selectedStudent) {
      toast.error('Nenhum aluno selecionado');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteFutureAppointments = async () => {
    if (!selectedStudent) return;

    const studentUserId = getSelectedStudentUserId();
    if (!studentUserId) {
      toast.error('ID do aluno não encontrado');
      return;
    }

    try {
      await deleteFutureAppointments(studentUserId);
      setShowDeleteConfirm(false);
      toast.success('Agendamentos futuros excluídos com sucesso');
    } catch (error) {
      toast.error('Erro ao excluir agendamentos futuros');
    }
  };

  const handleSaveAppointment = async (appointment: any) => {
    try {
      const studentUserId = getSelectedStudentUserId();
      if (!studentUserId) {
        toast.error('Dados do aluno não encontrados');
        return;
      }

      if (!user?.id) {
        toast.error('Usuário não autenticado');
        return;
      }

      await addAppointment({
        title: appointment.service || 'Agendamento',
        description: appointment.objective,
        student_id: studentUserId,
        teacher_id: user.id,
        scheduled_time: new Date(appointment.date.getTime() +
          parseInt(appointment.time.split(':')[0]) * 60 * 60 * 1000 +
          parseInt(appointment.time.split(':')[1]) * 60 * 1000).toISOString(),
        duration: parseInt(appointment.duration),
        type: appointment.service,
        location: appointment.academy,
        notes: appointment.notes,
        status: appointment.status
      });

      setShowNewAppointment(false);
      toast.success('Agendamento criado com sucesso');
    } catch (error) {
      toast.error('Erro ao criar agendamento');
    }
  };

  const handleSavePeriodAppointments = async (appointments: any[]) => {
    try {
      const studentUserId = getSelectedStudentUserId();
      if (!studentUserId) {
        toast.error('Dados do aluno não encontrados');
        return;
      }

      if (!user?.id) {
        toast.error('Usuário não autenticado');
        return;
      }

      for (const appointment of appointments) {
        await addAppointment({
          title: appointment.service || 'Agendamento',
          description: appointment.objective,
          student_id: studentUserId,
          teacher_id: user.id,
          scheduled_time: new Date(appointment.date.getTime()).toISOString(),
          duration: parseInt(appointment.duration),
          type: appointment.service,
          location: appointment.academy,
          notes: appointment.notes,
          status: appointment.status
        });
      }

      setShowPeriodAppointment(false);
      toast.success(`${appointments.length} agendamentos criados com sucesso`);
    } catch (error) {
      toast.error('Erro ao criar agendamentos');
    }
  };

  // Estados para filtros na aba de alunos
  const [statusFilter, setStatusFilter] = useState('todos');
  const [planFilter, setPlanFilter] = useState('todos');
  const [modalityFilter, setModalityFilter] = useState('todos');

  // Remove useTrainingPlan dependency to avoid context provider issues
  // Training plans are now handled directly in the EnhancedStudentTrainingPlansView component

  // Combine students with subscription data
  const students: Student[] = rawStudents.map(student => {
    // Find all subscriptions for this student (active and historical)
    const studentSubscriptions = subscriptions?.filter(sub =>
      sub.student_user_id === student.user_id
    ) || [];

    // Find active subscription for this student
    const activeSubscription = studentSubscriptions.find(sub =>
      sub.status === 'active' &&
      (sub.end_at === null || new Date(sub.end_at) > new Date())
    );

    // Check if student has ever had any subscription (paid consultation)
    const hasEverHadSubscription = studentSubscriptions.length > 0;

    // Find the plan details
    const plan = activeSubscription ? membershipPlans?.find(p => p.id === activeSubscription.plan_id) : null;

    // Calculate days remaining based on student membership_expiry  
    const expirationDate = student.membership_expiry;
    const daysRemaining = expirationDate
      ? Math.max(0, Math.ceil((new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Use student's actual modality
    const modality = student.mode || 'Não informado';

    // Determine status: 'active', 'inactive', or 'free'
    let status: 'active' | 'inactive' | 'free';
    if (activeSubscription) {
      status = 'active';
    } else if (hasEverHadSubscription) {
      status = 'inactive';
    } else {
      status = 'free';
    }

    return {
      id: parseInt(student.id.replace(/-/g, '').substring(0, 8), 16), // Convert UUID to number for compatibility
      name: student.name,
      email: student.email,
      plan: plan?.name || student.plan || 'Sem plano',
      modality,
      daysRemaining,
      status,
      age: 25, // Default since we don't have age data
      height: '1.75m', // Default since we don't have height data
      weight: '70kg', // Default since we don't have weight data
    };
  }).filter(student => {
    // Na aba "ativas", mostrar TODOS os alunos vinculados ao professor
    // Isso inclui alunos com qualquer status (active, inactive, free)
    // A aba é chamada "ativas" mas deve mostrar todas as consultorias/alunos gerenciáveis
    if (activeTab === 'ativas') {
      return true; // Mostrar todos os alunos vinculados
    }
    // In other tabs, show all students
    return true;
  });

  // Filter students based on current filters
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

  // Calculate statistics for consulting
  const activeStudents = students.filter(s => s.status === 'active').length;
  const inactiveStudents = students.filter(s => s.status === 'inactive').length;

  const consultingData = {
    feedbacks: [],
    mensagens: [],
    planos: []
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setStudentTab('agendamentos');
  };

  const handleBackToList = () => {
    setSelectedStudent(null);
  };

  const studentTabs = [
    { id: 'progresso', label: 'Progresso' },
    { id: 'agendamentos', label: 'Agendamentos' },
    { id: 'anamnese', label: 'Anamnese' },
    { id: 'avaliacoes', label: 'Avaliações' },
    { id: 'dietas', label: 'Dietas' },
    { id: 'treinos', label: 'Treinos' },
    { id: 'exames', label: 'Exames' },
    { id: 'feedbacks', label: 'Feedbacks' },
    { id: 'fotos', label: 'Fotos' },
    { id: 'monitoramento', label: 'Monitoramento' },
    { id: 'notas', label: 'Notas' }
  ];

  const renderStudentTabContent = () => {
    switch (studentTab) {
      case 'progresso':
        const progressStudentUserId = rawStudents.find(s => s.name === selectedStudent?.name)?.user_id;
        return (
          <ProgressTrackingTab
            studentUserId={progressStudentUserId || ''}
            studentName={selectedStudent?.name || ''}
          />
        );

      case 'agendamentos':
        return (
          <div className="p-6">
            <StudentAppointmentsList
              studentId={rawStudents.find(s => s.name === selectedStudent?.name)?.user_id}
              teacherId={rawStudents.find(s => s.name === selectedStudent?.name)?.teacher_id}
              onConfirmAppointment={handleConfirmAppointment}
              onCancelAppointment={handleCancelAppointment}
            />
          </div>
        );

      case 'anamnese':
        const anamneseStudentUserId = rawStudents.find(s => s.name === selectedStudent?.name)?.user_id;
        return (
          <StudentAnamneseTab
            studentUserId={anamneseStudentUserId || ''}
            studentName={selectedStudent?.name || ''}
          />
        );

      case 'avaliacoes':
        const avaliacaoStudentUserId = rawStudents.find(s => s.name === selectedStudent?.name)?.user_id;
        return (
          <StudentEvaluationsTab
            studentId={avaliacaoStudentUserId}
            studentName={selectedStudent?.name || ''}
          />
        );

      case 'dietas':
        const dietStudentUserId = rawStudents.find(s => s.name === selectedStudent?.name)?.user_id;
        return (
          <MealPlansManager
            studentUserId={dietStudentUserId || ''}
            studentName={selectedStudent?.name || ''}
            isStudentView={false}
          />
        );

      case 'treinos':
        const studentUserId = rawStudents.find(s => s.name === selectedStudent?.name)?.user_id;
        return <StudentTrainingPlansView studentUserId={studentUserId || ''} studentName={selectedStudent?.name || ''} />;

      case 'exames':
        const examsStudentUserId = rawStudents.find(s => s.name === selectedStudent?.name)?.user_id;
        return (
          <MedicalExamsTab
            studentUserId={examsStudentUserId || ''}
            studentName={selectedStudent?.name || ''}
          />
        );

      case 'feedbacks':
        const feedbacksStudentUserId = rawStudents.find(s => s.name === selectedStudent?.name)?.user_id;
        return (
          <FeedbacksTab
            studentUserId={feedbacksStudentUserId || ''}
            studentName={selectedStudent?.name || ''}
          />
        );

      case 'fotos':
        const photosStudentUserId = rawStudents.find(s => s.name === selectedStudent?.name)?.user_id;
        return (
          <ProgressPhotosTab
            studentUserId={photosStudentUserId || ''}
            studentName={selectedStudent?.name || ''}
          />
        );

      case 'monitoramento':
        const monitoringStudentUserId = rawStudents.find(s => s.name === selectedStudent?.name)?.user_id;
        return (
          <StudentMonitoringTab
            studentUserId={monitoringStudentUserId || ''}
            studentName={selectedStudent?.name || ''}
          />
        );

      case 'notas':
        return (
          <div className="p-6">
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma nota encontrada para este aluno.
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6">
            <div className="text-center py-12 text-muted-foreground">
              Selecione uma aba para visualizar o conteúdo.
            </div>
          </div>
        );
    }
  };

  const renderStudentDetail = () => {
    if (!selectedStudent) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-muted rounded-full"></div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedStudent.name}</h2>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>{selectedStudent.age} anos</span>
                  <span>{selectedStudent.height}</span>
                  <span>{selectedStudent.weight}</span>
                  <span>{selectedStudent.plan}</span>
                </div>
                <Badge className={`mt-1 ${selectedStudent.daysRemaining <= 0
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : selectedStudent.daysRemaining <= 7
                    ? 'bg-warning/10 text-warning border-warning/20'
                    : selectedStudent.daysRemaining <= 30
                      ? 'bg-secondary/10 text-secondary border-secondary/20'
                      : 'bg-success/10 text-success border-success/20'
                  }`}>
                  {selectedStudent.daysRemaining <= 0
                    ? 'Vencido'
                    : `${selectedStudent.daysRemaining} dias restantes`}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleOpenWhatsApp}
            >
              <Phone className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleOpenChat}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Mensagens
            </Button>
          </div>
        </div>

        {/* Student Tabs */}
        <div className="flex flex-wrap gap-1">
          {studentTabs.map((tab) => (
            <Button
              key={tab.id}
              variant={studentTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setStudentTab(tab.id)}
              className={
                studentTab === tab.id
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Student Tab Content */}
        <Card className="bg-card border-border p-3 md:p-4 lg:p-6">
          {renderStudentTabContent()}
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    if (selectedStudent) {
      return renderStudentDetail();
    }

    switch (activeTab) {
      case 'ativas':
        return (
          <div className="space-y-6">
            {/* Header */}
            <h1 className="text-2xl font-bold text-foreground">Consultorias ativas</h1>

            {/* Status Indicators */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-destructive rounded-full"></div>
                <span className="text-muted-foreground">1 Pendente</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-info rounded-full"></div>
                <span className="text-muted-foreground">Nenhum entregue</span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-10 bg-input border-border text-foreground placeholder-muted-foreground"
                />
              </div>

              <div className="relative flex-1 max-w-sm">
                <Input
                  placeholder="Buscar por ema"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="bg-input border-border text-foreground placeholder-muted-foreground"
                />
              </div>

              <Select>
                <SelectTrigger className="w-48 bg-input border-border text-foreground">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger className="w-48 bg-input border-border text-foreground">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="todos">Todos os planos</SelectItem>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger className="w-48 bg-input border-border text-foreground">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="todos">Todas modalidades</SelectItem>
                  <SelectItem value="dieta">Dieta</SelectItem>
                  <SelectItem value="treino">Treino</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="border-success text-success hover:bg-success/10">
                Limpar filtros
              </Button>
            </div>

            {/* Students Table */}
            <Card className="bg-card border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Aluno</TableHead>
                    <TableHead className="text-muted-foreground">E-mail</TableHead>
                    <TableHead className="text-muted-foreground">Plano</TableHead>
                    <TableHead className="text-muted-foreground">Modalidade</TableHead>
                    <TableHead className="text-muted-foreground">Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow
                      key={student.id}
                      className="border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => handleStudentClick(student)}
                    >
                      <TableCell>
                        <div className={`w-3 h-3 rounded-full ${student.status === 'inactive' ? 'bg-warning' : student.status === 'active' ? 'bg-success' : 'bg-muted'
                          }`}></div>
                      </TableCell>
                      <TableCell className="text-foreground font-medium">{student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{student.email}</TableCell>
                      <TableCell className="text-muted-foreground">{student.plan}</TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${student.modality === 'Dieta' ? 'text-info' : 'text-warning'
                          }`}>
                          {student.modality === 'Dieta' ? '🍎' : '💪'} {student.modality}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-success/10 text-success border-success/20">
                          {student.daysRemaining} dias restantes
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-4 text-center text-muted-foreground text-sm border-t border-border">
                {filteredStudents.length === 0
                  ? 'Nenhum registro encontrado'
                  : `Exibindo ${filteredStudents.length} registro(s)`}
              </div>
            </Card>
          </div>
        );

      case 'feedbacks':
        return <EvaluationsOverview type="feedbacks" />;


      case 'planos':
        return (
          <div className="space-y-4">
            {/* Payment Configuration Alert */}
            <PaymentConfigAlert
              onConfigureClick={() => window.location.href = '/?section=pagamentos'}
              className="mb-4"
            />

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
                <Card key={p.id} className="bg-gradient-to-br from-card to-card/80 border-border p-6 hover:shadow-lg transition-all">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br from-background to-muted border-2 border-border`}>
                      <IconComponent className={`h-8 w-8 ${planIcon.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xl font-bold text-foreground">{p.name}</h4>
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
                              / {p.interval === 'monthly' ? 'mês' : p.interval === 'quarterly' ? 'trimestre' : 'ano'}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-primary">
                            {getActiveSubscribersCount(p.id)}
                          </p>
                          <p className="text-xs text-muted-foreground">Assinantes</p>
                        </div>
                      </div>

                      {p.description && (
                        <p className="text-sm text-muted-foreground mb-4">{p.description}</p>
                      )}

                      <div className="space-y-2">
                        <h5 className="font-semibold text-foreground">Benefícios inclusos:</h5>
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

                          {/* New Appointment Modal */}
                          <NewAppointmentModal
                            isOpen={showNewAppointment}
                            onClose={() => setShowNewAppointment(false)}
                            onSave={handleSaveAppointment}
                          />

                          {/* Period Appointment Modal */}
                          <PeriodAppointmentModal
                            isOpen={showPeriodAppointment}
                            onClose={() => setShowPeriodAppointment(false)}
                            onSave={handleSavePeriodAppointments}
                            preSelectedStudentId={getSelectedStudentUserId()}
                          />

                          {/* Delete Future Appointments Confirmation */}
                          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir todos os agendamentos futuros de {selectedStudent?.name}?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleConfirmDeleteFutureAppointments}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir Agendamentos
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
                          onClick={() => {
                            const paymentStatus = getPaymentConfigStatus();
                            if (paymentStatus.status !== 'configured') {
                              toast.error('Sistema não configurado. Contate o administrador.');
                              return;
                            }
                            handleCreateCheckout(p.id);
                          }}
                          disabled={checkoutLoading || paymentLoading || !isPaymentConfigured()}
                          className="flex-1"
                        >
                          {checkoutLoading || paymentLoading ? (
                            <>
                              <div className="animate-spin h-4 w-4 mr-2 rounded-full border-2 border-primary border-t-transparent" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Checkout
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        );

      case 'alunos':
        // Show loading state while data is being fetched
        if (studentsLoading || plansLoading) {
          return (
            <div className="space-y-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando alunos...</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Alunos em Consultoria</h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Ativos: {activeStudents}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  <span>Inativos: {inactiveStudents}</span>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-input border-border text-foreground">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-48 bg-input border-border text-foreground">
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="todos">Todos os planos</SelectItem>
                  <SelectItem value="Básica">Básica</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="P">P</SelectItem>
                </SelectContent>
              </Select>

              <Select value={modalityFilter} onValueChange={setModalityFilter}>
                <SelectTrigger className="w-48 bg-input border-border text-foreground">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="todos">Todas modalidades</SelectItem>
                  <SelectItem value="Dieta">Dieta</SelectItem>
                  <SelectItem value="Treino">Treino</SelectItem>
                  <SelectItem value="Treino + Dieta">Treino + Dieta</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('todos');
                  setPlanFilter('todos');
                  setModalityFilter('todos');
                }}
                className="border-success text-success hover:bg-success/10"
              >
                Limpar filtros
              </Button>
            </div>

            {/* Tabela de Alunos */}
            <Card className="bg-card border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Aluno</TableHead>
                    <TableHead className="text-muted-foreground">E-mail</TableHead>
                    <TableHead className="text-muted-foreground">Plano</TableHead>
                    <TableHead className="text-muted-foreground">Modalidade</TableHead>
                    <TableHead className="text-muted-foreground">Dias Restantes</TableHead>
                    <TableHead className="text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {students.length === 0 ? 'Nenhum aluno com consultoria encontrado' : 'Nenhum aluno encontrado com os filtros aplicados'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow
                        key={student.id}
                        className="border-border hover:bg-muted/30 cursor-pointer"
                        onClick={() => handleStudentClick(student)}
                      >
                        <TableCell>
                          <Badge className={student.daysRemaining > 0 ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}>
                            {student.daysRemaining > 0 ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground font-medium">{student.name}</TableCell>
                        <TableCell className="text-muted-foreground">{student.email}</TableCell>
                        <TableCell className="text-muted-foreground">{student.plan}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-2 text-sm font-medium ${student.modality.includes('Dieta') && student.modality.includes('Treino') ? 'text-warning' :
                            student.modality === 'Dieta' ? 'text-info' : 'text-warning'
                            }`}>
                            {student.modality.includes('Dieta') && student.modality.includes('Treino') ? (
                              <Activity className="w-4 h-4" />
                            ) : student.modality === 'Dieta' ? (
                              <Utensils className="w-4 h-4" />
                            ) : (
                              <Dumbbell className="w-4 h-4" />
                            )}
                            {student.modality}
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.daysRemaining > 0 ? (
                            <Badge className="bg-success/10 text-success border-success/20">
                              {student.daysRemaining} dias
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                              Expirado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStudentClick(student)}
                              className="text-info hover:text-info/80"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-warning hover:text-warning/80"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="p-4 text-center text-muted-foreground text-sm border-t border-border">
                Exibindo {filteredStudents.length} de {students.length} alunos
              </div>
            </Card>
          </div>
        );

      case 'avaliacoes':
        return (
          <div className="p-6">
            <EvaluationsOverview />
          </div>
        );

      case 'desistencias':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Análise de Desistências</h3>
            <Card className="bg-card border-border p-4">
              <p className="text-muted-foreground">Relatórios e análises de cancelamentos de consultoria.</p>
            </Card>
          </div>
        );

      case 'predefinicoes':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Predefinições</h3>
            <Card className="bg-card border-border p-4">
              <p className="text-muted-foreground">Configure mensagens e planos padrão para consultoria.</p>
            </Card>
          </div>
        );

      case 'ferramentas':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Ferramentas</h3>
            <Card className="bg-card border-border p-4">
              <p className="text-muted-foreground">Integrações e recursos extras para consultoria.</p>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'ativas': return <MessageSquare className="w-4 h-4" />;
      case 'feedbacks': return <Star className="w-4 h-4" />;

      case 'planos': return <FileText className="w-4 h-4" />;
      case 'alunos': return <Users className="w-4 h-4" />;
      case 'avaliacoes': return <ClipboardCheck className="w-4 h-4" />;
      case 'desistencias': return <TrendingDown className="w-4 h-4" />;
      case 'predefinicoes': return <Settings className="w-4 h-4" />;
      case 'ferramentas': return <Wrench className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const tabs = [
    { id: 'ativas', label: 'Consultorias Ativas' },
    { id: 'feedbacks', label: 'Feedbacks' },
    { id: 'planos', label: 'Planos' }
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
              {tabs.map((tab) => (
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
                  {getTabIcon(tab.id)}
                  <span className="ml-2">{tab.label}</span>
                </Button>
              ))}
            </div>
          </Card>
        </>
      )}

      {renderContent()}

      {selectedStudent && (
        <>
          <TrainingPlanModal
            isOpen={showTrainingModal}
            onClose={() => {
              setShowTrainingModal(false);
              setRefreshKey(prev => prev + 1); // Forçar atualização
            }}
            studentName={selectedStudent.name}
            studentId={rawStudents.find(s => s.name === selectedStudent?.name)?.user_id || ''}
          />
          <MealPlanModal
            open={showDietModal}
            onClose={() => setShowDietModal(false)}
            studentUserId={rawStudents.find(s => s.name === selectedStudent?.name)?.user_id || ''}
          />
          <StudentProfileModal
            isOpen={showStudentProfile}
            onClose={() => setShowStudentProfile(false)}
            studentName={selectedStudent.name}
            studentId={rawStudents.find(s => s.name === selectedStudent?.name)?.user_id || ''}
          />
        </>
      )}

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

      {/* Edit Plan Modal */}
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
                  await updatePlan(editingPlan.id, payload);
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

      {/* Plan Management Modal */}
      <PlanManagementModal
        plan={managingPlan}
        subscriptions={subscriptions || []}
        isOpen={!!managingPlan}
        onClose={() => setManagingPlan(null)}
        onUpdatePlan={async (planId, updates) => {
          await updatePlan(planId, updates);
        }}
      />

      {/* Delete Plan Confirmation */}
      <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{deletingPlan?.name}"?
              Esta ação não pode ser desfeita e todos os assinantes serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPlan && handleDeletePlan(deletingPlan.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setAppointmentToCancel(null);
        }}
        onConfirm={handleCancelConfirm}
        appointment={appointmentToCancel}
      />
    </div>
  );
}