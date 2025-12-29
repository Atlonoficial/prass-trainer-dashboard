import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Search, Edit, Trash2, MessageSquare, Clock, TrendingUp, Eye, Calendar, Plus } from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { useAuth } from '@/hooks/useAuth';
import { usePlans } from '@/hooks/usePlans';
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '@/components/LoadingSpinner';

import EditStudentModal from '@/components/students/EditStudentModal';
import StudentProfileModal from '@/components/students/StudentProfileModal';
import QuickViewModal from '@/components/students/QuickViewModal';
import { getExpirationDisplay } from '@/lib/studentUtils';
import SendMessageModal from '@/components/students/SendMessageModal';
import ProgressModal from '@/components/students/ProgressModal';
import TrainingPlanModal from '@/components/training/TrainingPlanModal';
import { MealPlanModal } from '@/components/nutrition';
import ScheduleConsultationModal from '@/components/schedule/ScheduleConsultationModal';
import ReportsModal from '@/components/reports/ReportsModal';
import { toast } from '@/hooks/use-toast';

import { useStudentSyncListener } from '@/hooks/useStudentSync';
import { useIsMobile } from '@/hooks/use-mobile';
import { StudentManagementMobile } from './StudentManagementMobile';

export default function StudentManagementSection() {
  const { students, loading, error, updateStudent, refetch } = useStudents();
  const isMobile = useIsMobile();

  // Sistema de sincronização inteligente
  useStudentSyncListener(async () => {
    console.log('🔔 StudentManagementSection: Recebeu evento de sincronização');
    await refetch();
  });

  // Debug logs
  console.log('🎯 StudentManagementSection - Estado:', {
    studentsCount: students?.length || 0,
    loading,
    error,
    students: students?.slice(0, 2) // Primeiros 2 para debug
  });

  const { user } = useAuth();
  const { plans, loading: plansLoading, refetch: refetchPlans } = usePlans();

  // Debug logs para planos
  console.log('📋 StudentManagementSection - Plans Debug:', {
    plansCount: plans?.length || 0,
    plansLoading,
    plans: plans?.map(p => ({ id: p.id, name: p.name })) || [],
    hasPlansData: !!plans && plans.length > 0
  });
  const [searchName, setSearchName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('todos');
  const [selectedMode, setSelectedMode] = useState('todos');
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [selectedGoal, setSelectedGoal] = useState('todos');
  const [selectedEvaluation, setSelectedEvaluation] = useState('todos');
  const [selectedSort, setSelectedSort] = useState('mais-recente');
  const [noPending, setNoPending] = useState(false);
  const [noDelivered, setNoDelivered] = useState(false);

  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isQuickViewModalOpen, setIsQuickViewModalOpen] = useState(false);
  const [isSendMessageModalOpen, setIsSendMessageModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isDietModalOpen, setIsDietModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('studentsPerPage');
    return saved ? parseInt(saved) : 10;
  });

  // Função para buscar o nome do plano pelo ID
  const getPlanName = (student: any) => {
    // Prioriza o active_plan que é sincronizado automaticamente com as assinaturas
    const planId = student.active_plan;

    if (!planId || planId === 'free') return 'Gratuito';
    if (planId === 'none' || planId === 'no-plans' || planId === 'loading') return 'Nenhum';

    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : planId; // Se não encontrar o plano, mostra o ID
  };

  // Função para obter detalhes completos do plano
  const getPlanDetails = (student: any) => {
    const planId = student.active_plan;

    // Debug para este estudante específico
    console.log('🔍 getPlanDetails Debug:', {
      studentName: student.name,
      planId,
      availablePlans: plans?.map(p => ({ id: p.id, name: p.name })),
      plansLoading
    });

    if (!planId || planId === 'free') {
      return {
        name: 'Gratuito',
        price: 'R$ 0,00',
        interval: '',
        status: 'Ativo'
      };
    }

    if (planId === 'none' || planId === 'no-plans' || planId === 'loading') {
      return {
        name: 'Nenhum plano',
        price: '',
        interval: '',
        status: 'Inativo'
      };
    }

    // Se ainda está carregando os planos
    if (plansLoading) {
      return {
        name: 'Carregando...',
        price: '',
        interval: '',
        status: 'Carregando'
      };
    }

    const plan = plans.find(p => p.id === planId);
    if (plan) {
      return {
        name: plan.name,
        price: plan.price ? `R$ ${plan.price}` : '',
        interval: plan.interval ? `/${plan.interval}` : '',
        status: 'Ativo'
      };
    }

    // Fallback melhorado se plano não encontrado
    return {
      name: `${planId} (não encontrado)`,
      price: '',
      interval: '',
      status: 'Erro'
    };
  };

  // Função para formatar campos de exibição
  const getDisplayValue = (value: any, fallback: string = 'Não definido') => {
    if (!value || value === 'undefined' || value === 'null') return fallback;
    return value;
  };

  // Função para formatar objetivos/metas
  const getGoalsDisplay = (student: any) => {
    // Usar array goals primeiro, fallback para goal
    const studentGoals = Array.isArray(student.goals) && student.goals.length > 0
      ? student.goals
      : [];

    if (studentGoals.length === 0) return 'Não definido';

    // Valores reais dos objetivos
    return studentGoals.join(', ');
  };

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, searchEmail, selectedPlan, selectedMode, selectedStatus, selectedGoal, selectedEvaluation, selectedSort]);

  // Persistir preferência de itens por página
  useEffect(() => {
    localStorage.setItem('studentsPerPage', itemsPerPage.toString());
  }, [itemsPerPage]);

  // Função de filtragem funcional
  const filteredStudents = students.filter(student => {
    // Filtro por nome
    if (searchName && !student.name.toLowerCase().includes(searchName.toLowerCase())) {
      return false;
    }

    // Filtro por email
    if (searchEmail && !student.email.toLowerCase().includes(searchEmail.toLowerCase())) {
      return false;
    }

    // Filtro por plano - usar IDs reais
    if (selectedPlan !== 'todos') {
      const planId = student.active_plan;
      if (planId !== selectedPlan) {
        return false;
      }
    }

    // Filtro por modalidade
    if (selectedMode !== 'todos') {
      const modeMap = {
        'presencial': 'Presencial',
        'online': 'Online',
        'hibrido': 'Híbrido'
      };
      if (student.mode !== modeMap[selectedMode as keyof typeof modeMap]) {
        return false;
      }
    }

    // Filtro por status
    if (selectedStatus !== 'todos') {
      const statusMap = {
        'ativo': 'active',
        'inativo': 'inactive',
        'suspenso': 'suspended'
      };
      if (student.membership_status !== statusMap[selectedStatus as keyof typeof statusMap]) {
        return false;
      }
    }

    // Filtro por objetivo - usar valores reais do array goals
    if (selectedGoal !== 'todos') {
      const studentGoals = Array.isArray(student.goals) ? student.goals : [];
      if (!studentGoals.includes(selectedGoal)) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    // Ordenação
    switch (selectedSort) {
      case 'mais-recente':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'mais-antigo':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'nome-a-z':
        return a.name.localeCompare(b.name);
      case 'nome-z-a':
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });

  // Cálculos de paginação
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Funções de navegação
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'active': 'bg-green-400/10 text-green-400 border-green-400/20',
      'inactive': 'bg-red-400/10 text-red-400 border-red-400/20',
      'suspended': 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-400/10 text-gray-400 border-gray-400/20';
  };

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      'active': 'Ativo',
      'inactive': 'Inativo',
      'suspended': 'Suspenso'
    };
    return statusMap[status as keyof typeof statusMap] || 'Inativo';
  };

  const handleStudentClick = (student: any) => {
    setSelectedStudent(student);
    setIsEditStudentModalOpen(true);
  };

  const handleViewProfile = (student: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setIsQuickViewModalOpen(true);
  };

  const handleEditStudent = (student: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setIsEditStudentModalOpen(true);
  };

  const handleSaveStudent = async (updatedStudent: any) => {
    try {
      console.log('💾 StudentManagementSection: Iniciando salvamento...', {
        studentId: updatedStudent.user_id || updatedStudent.id,
        changes: {
          plan: updatedStudent.plan || updatedStudent.active_plan,
          expiry: updatedStudent.membership_expiry,
          status: updatedStudent.status || updatedStudent.membership_status
        }
      });

      const success = await updateStudent(updatedStudent);

      if (success) {
        console.log('✅ StudentManagementSection: Salvamento bem-sucedido');

        // Sincronização inteligente
        await refetch();

        // Feedback visual imediato
        toast({
          title: "Sucesso",
          description: "Alterações salvas e sincronizadas",
          variant: "default",
        });

        // Aguardar sincronização completa
        await new Promise(resolve => setTimeout(resolve, 150));

        console.log('🎉 StudentManagementSection: Sincronização concluída');
        return true;
      } else {
        throw new Error('Falha na operação de salvamento');
      }
    } catch (error) {
      console.error('❌ StudentManagementSection: Erro crítico:', error);
      toast({
        title: "Erro",
        description: `Falha ao salvar: ${error.message}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const handleOpenTraining = () => {
    setIsTrainingModalOpen(true);
  };

  const handleOpenAnamnesis = () => {
    setIsProfileModalOpen(true);
  };

  const handleOpenConsulting = () => {
    setIsScheduleModalOpen(true);
  };

  const handleOpenDiet = () => {
    setIsDietModalOpen(true);
  };

  const handleOpenFullProfile = () => {
    setIsProfileModalOpen(true);
  };

  const handleSendMessage = () => {
    if (!selectedStudent) return;
    setIsSendMessageModalOpen(true);
  };

  const handleScheduleConsultation = () => {
    if (!selectedStudent) return;
    setIsScheduleModalOpen(true);
  };

  const handleViewProgress = () => {
    if (!selectedStudent) return;
    setIsProgressModalOpen(true);
  };

  const handleGenerateReport = () => {
    if (!selectedStudent) return;
    setIsReportsModalOpen(true);
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <LoadingSpinner message="Carregando alunos..." />
          <p className="text-sm text-muted-foreground mt-2">
            Aguarde enquanto buscamos seus alunos...
          </p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <div className="text-destructive mb-2">❌ Erro ao carregar dados</div>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => refetch()} variant="outline">
            Tentar Novamente
          </Button>
        </div>
      </Card>
    );
  }

  // Nota: Não fazemos early return quando não há estudantes
  // O layout completo com filtros deve ser exibido mesmo assim

  // Renderização condicional para mobile
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Gestão de Alunos</h1>
              <p className="text-xs text-muted-foreground">Gerencie seus alunos</p>
            </div>
          </div>
        </div>

        {/* Debug Alert para Planos - Mobile */}
        {!plansLoading && (!plans || plans.length === 0) && (
          <Card className="bg-yellow-500/10 border-yellow-500/20 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-400 font-medium text-sm">
                  Nenhum plano encontrado
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchPlans()}
                className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs px-2 py-1"
              >
                Recarregar
              </Button>
            </div>
          </Card>
        )}

        {/* Mobile Component */}
        <StudentManagementMobile
          students={filteredStudents}
          searchName={searchName}
          setSearchName={setSearchName}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          onStudentClick={handleStudentClick}
          onViewProfile={handleViewProfile}
          onEditStudent={handleEditStudent}
          plans={plans}
          getStatusBadge={getStatusBadge}
          getStatusDisplay={getStatusDisplay}
          getPlanName={getPlanName}
        />

        {/* Mobile Modals */}
        <EditStudentModal
          isOpen={isEditStudentModalOpen}
          onClose={() => setIsEditStudentModalOpen(false)}
          student={selectedStudent}
        />

        <QuickViewModal
          isOpen={isQuickViewModalOpen}
          onClose={() => setIsQuickViewModalOpen(false)}
          student={selectedStudent}
          onOpenTraining={handleOpenTraining}
          onOpenAnamnesis={handleOpenAnamnesis}
          onOpenConsulting={handleOpenConsulting}
          onOpenDiet={handleOpenDiet}
          onOpenFullProfile={handleOpenFullProfile}
          onSendMessage={handleSendMessage}
          onScheduleConsultation={handleScheduleConsultation}
          onViewProgress={handleViewProgress}
          onGenerateReport={handleGenerateReport}
          onEditStudent={() => {
            setIsQuickViewModalOpen(false);
            setIsEditStudentModalOpen(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Alunos</h1>
            <p className="text-muted-foreground">Gerencie todos os seus alunos em um só lugar</p>
          </div>
        </div>
      </div>

      {/* Debug Alert para Planos */}
      {!plansLoading && (!plans || plans.length === 0) && (
        <Card className="bg-yellow-500/10 border-yellow-500/20 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-400 font-medium">
                Nenhum plano encontrado no catálogo
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchPlans()}
              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
            >
              Recarregar Planos
            </Button>
          </div>
          <p className="text-yellow-400/80 text-sm mt-2">
            Os nomes dos planos podem aparecer como códigos até os dados serem carregados.
          </p>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-card border-border p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Buscar por nome</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Nome do aluno..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-10 bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Buscar por email</label>
            <Input
              placeholder="Email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="bg-input border-border text-foreground"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Plano</label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os planos</SelectItem>
                {plans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                ))}
                <SelectItem value="none">Sem plano</SelectItem>
                <SelectItem value="free">Gratuito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Modalidade</label>
            <Select value={selectedMode} onValueChange={setSelectedMode}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Objetivo</label>
            <Select value={selectedGoal} onValueChange={setSelectedGoal}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos objetivos</SelectItem>
                <SelectItem value="Perda de peso">Perda de peso</SelectItem>
                <SelectItem value="Ganho de massa muscular">Ganho de massa muscular</SelectItem>
                <SelectItem value="Definição corporal">Definição corporal</SelectItem>
                <SelectItem value="Melhoria do condicionamento">Melhoria do condicionamento</SelectItem>
                <SelectItem value="Reabilitação">Reabilitação</SelectItem>
                <SelectItem value="Bem-estar geral">Bem-estar geral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Avaliação</label>
            <Select value={selectedEvaluation} onValueChange={setSelectedEvaluation}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="completa">Completa</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Ordenar por</label>
            <Select value={selectedSort} onValueChange={setSelectedSort}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mais-recente">Mais recente</SelectItem>
                <SelectItem value="mais-antigo">Mais antigo</SelectItem>
                <SelectItem value="nome-a-z">Nome A-Z</SelectItem>
                <SelectItem value="nome-z-a">Nome Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="no-pending"
              checked={noPending}
              onCheckedChange={(checked) => setNoPending(checked === true)}
            />
            <label htmlFor="no-pending" className="text-sm text-muted-foreground">
              Ocultar pendências (0)
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="no-delivered"
              checked={noDelivered}
              onCheckedChange={(checked) => setNoDelivered(checked === true)}
            />
            <label htmlFor="no-delivered" className="text-sm text-muted-foreground">
              Ocultar entregues (0)
            </label>
          </div>

          <div className="ml-auto">
            <Badge variant="outline" className="text-primary border-primary">
              {filteredStudents.length} aluno{filteredStudents.length !== 1 ? 's' : ''} encontrado{filteredStudents.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Students Table */}
      <Card className="bg-card border-border">
        {/* Controles de paginação - Topo */}
        {filteredStudents.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mostrar</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-[70px] h-9 bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">por página</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Exibindo <span className="text-foreground font-medium">{startIndex + 1}</span> a{' '}
              <span className="text-foreground font-medium">{Math.min(endIndex, filteredStudents.length)}</span> de{' '}
              <span className="text-foreground font-medium">{filteredStudents.length}</span> estudante{filteredStudents.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum aluno encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {students.length === 0
                ? "Você ainda não possui alunos cadastrados."
                : "Nenhum aluno corresponde aos filtros aplicados."
              }
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Aluno</TableHead>
                    <TableHead className="text-muted-foreground">Plano</TableHead>
                    <TableHead className="text-muted-foreground">Modalidade</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Objetivo</TableHead>
                    <TableHead className="text-muted-foreground">Vencimento</TableHead>
                    <TableHead className="text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.map((student) => (
                    <TableRow
                      key={student.id}
                      className="border-gray-700 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleStudentClick(student)}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={student.avatar} />
                            <AvatarFallback className="bg-green-400 text-gray-900">
                              {student.name ? student.name.split(' ').map(n => n[0]).join('') : ''}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-white font-medium" title={student.name}>{student.name}</p>
                            <p className="text-gray-400 text-sm" title={student.email}>{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{getPlanDetails(student).name}</span>
                            {plansLoading && (
                              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            )}
                            {getPlanDetails(student).status === 'Erro' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  refetchPlans();
                                }}
                                className="h-5 px-2 text-xs text-yellow-400 hover:text-yellow-300"
                              >
                                Recarregar
                              </Button>
                            )}
                          </div>
                          {getPlanDetails(student).price && (
                            <span className="text-gray-400 text-sm">
                              {getPlanDetails(student).price}{getPlanDetails(student).interval}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-300">{getDisplayValue(student.mode, 'Não definido')}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border ${getStatusBadge(student.membership_status || 'inactive')}`}>
                          {getStatusDisplay(student.membership_status || 'inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-300">{getGoalsDisplay(student)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-300">{getExpirationDisplay(student)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                            onClick={(e) => handleViewProfile(student, e)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                            onClick={(e) => handleEditStudent(student, e)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(student);
                              setIsSendMessageModalOpen(true);
                            }}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Navegação de páginas - Rodapé */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center px-6 py-4 border-t border-border">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Mostrar primeira página, última página, página atual e adjacentes
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <PaginationItem key={page}>
                            <span className="px-2 text-muted-foreground">...</span>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </Card>

      <EditStudentModal
        isOpen={isEditStudentModalOpen}
        onClose={() => setIsEditStudentModalOpen(false)}
        student={selectedStudent}
      />

      <StudentProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        studentName={selectedStudent?.name || ''}
        studentId={selectedStudent?.user_id || ''}
      />

      <QuickViewModal
        isOpen={isQuickViewModalOpen}
        onClose={() => setIsQuickViewModalOpen(false)}
        student={selectedStudent}
        onOpenTraining={handleOpenTraining}
        onOpenAnamnesis={handleOpenAnamnesis}
        onOpenConsulting={handleOpenConsulting}
        onOpenDiet={handleOpenDiet}
        onOpenFullProfile={handleOpenFullProfile}
        onSendMessage={handleSendMessage}
        onScheduleConsultation={handleScheduleConsultation}
        onViewProgress={handleViewProgress}
        onGenerateReport={handleGenerateReport}
        onEditStudent={() => {
          setIsQuickViewModalOpen(false);
          setIsEditStudentModalOpen(true);
        }}
      />

      <SendMessageModal
        isOpen={isSendMessageModalOpen}
        onClose={() => setIsSendMessageModalOpen(false)}
        studentName={selectedStudent?.name || ''}
        studentId={selectedStudent?.user_id || ''}
      />

      <ProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        studentName={selectedStudent?.name || ''}
        studentId={selectedStudent?.user_id || ''}
      />

      <TrainingPlanModal
        isOpen={isTrainingModalOpen}
        onClose={() => setIsTrainingModalOpen(false)}
        studentName={selectedStudent?.name || ''}
        studentId={selectedStudent?.user_id || ''}
      />

      <MealPlanModal
        open={isDietModalOpen}
        onClose={() => setIsDietModalOpen(false)}
        studentUserId={selectedStudent?.user_id || ''}
      />

      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        studentId={selectedStudent?.user_id || ''}
        studentName={selectedStudent?.name || ''}
      />
    </div>
  );
}