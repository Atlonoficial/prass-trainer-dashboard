import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  AlertCircle,
  Calendar,
  Download,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  MoreHorizontal,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Shield,
  Zap,
  PauseCircle
} from 'lucide-react';
import { useUnifiedPaymentSystem } from '@/hooks/useUnifiedPaymentSystem';
import { useTeacherAuth } from '@/hooks/useTeacherAuth';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// Import components with verified paths
import ManualPaymentModal from './ManualPaymentModal';

import { ManualChargeModal } from '@/components/payments/ManualChargeModal';
import { ManageChargesModal } from '@/components/payments/ManageChargesModal';
import { SubscriptionActionDialog } from '@/components/payments/SubscriptionActionDialog';

export default function OptimizedPaymentSection() {
  const {
    // Data
    paymentStats,
    paymentChartData,
    studentsWithPayments,
    transactions,

    // State
    loading,
    error,
    chartPeriodDays,
    setChartPeriodDays,

    // Actions
    smartRefresh,
    createManualPayment,
    cancelSubscription,
    pauseSubscription
  } = useUnifiedPaymentSystem();

  const { userId } = useTeacherAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isManualPaymentOpen, setIsManualPaymentOpen] = useState(false);
  const [manualChargeModalOpen, setManualChargeModalOpen] = useState(false);
  const [manageChargesModalOpen, setManageChargesModalOpen] = useState(false);

  // Subscription Action State
  const [subscriptionAction, setSubscriptionAction] = useState<{
    isOpen: boolean;
    type: 'cancel' | 'pause';
    studentId: string;
    studentName: string;
  }>({
    isOpen: false,
    type: 'cancel',
    studentId: '',
    studentName: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Filter students based on search and status
  const filteredStudents = studentsWithPayments.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || student.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter transactions
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'due_soon': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'suspended': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Em Dia';
      case 'overdue': return 'Atrasado';
      case 'due_soon': return 'Vence em Breve';
      case 'suspended': return 'Pausado';
      case 'inactive': return 'Inativo';
      default: return status;
    }
  };

  const handleSubscriptionAction = async () => {
    setActionLoading(true);
    try {
      let success = false;
      if (subscriptionAction.type === 'cancel') {
        success = await cancelSubscription(subscriptionAction.studentId);
      } else {
        success = await pauseSubscription(subscriptionAction.studentId);
      }

      if (success) {
        setSubscriptionAction(prev => ({ ...prev, isOpen: false }));
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openSubscriptionAction = (studentId: string, studentName: string, type: 'cancel' | 'pause') => {
    setSubscriptionAction({
      isOpen: true,
      type,
      studentId,
      studentName
    });
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar dados</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => smartRefresh(true)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
          <p className="text-muted-foreground">
            Gerencie pagamentos, assinaturas e fluxo de caixa.
          </p>
        </div>
        <div className="flex items-center gap-2">

          <Button onClick={() => smartRefresh(true)} variant="outline" size="icon" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Transação
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsManualPaymentOpen(true)}>
                <DollarSign className="mr-2 h-4 w-4" />
                Registrar Pagamento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setManualChargeModalOpen(true)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Criar Cobrança
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setManageChargesModalOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Gerenciar Cobranças
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="students">Alunos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(paymentStats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% em relação ao mês anterior
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(paymentStats.pendingAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  {paymentStats.dueSoonStudents} alunos a vencer
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(paymentStats.overdueAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  {paymentStats.overdueStudents} alunos atrasados
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Adimplência</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {paymentStats.totalStudents > 0
                    ? Math.round((paymentStats.paidStudents / paymentStats.totalStudents) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {paymentStats.paidStudents} de {paymentStats.totalStudents} alunos em dia
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Fluxo de Receita</CardTitle>
                  <Select
                    value={String(chartPeriodDays)}
                    onValueChange={(v) => setChartPeriodDays(Number(v))}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="90">3 meses</SelectItem>
                      <SelectItem value="180">6 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={paymentChartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        className="text-xs"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        className="text-xs"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: 'var(--radius)',
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Receita']}
                      />
                      <Area
                        type="monotone"
                        dataKey="receita"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {recentTransactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma transação recente
                      </div>
                    ) : (
                      recentTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${transaction.status === 'paid' ? 'bg-green-100 text-green-600' :
                              transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-red-100 text-red-600'
                              }`}>
                              {transaction.status === 'paid' ? <ArrowDownRight className="h-4 w-4" /> :
                                <Clock className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {transaction.metadata?.student_name || 'Aluno'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${transaction.status === 'paid' ? 'text-green-600' : 'text-muted-foreground'
                              }`}>
                              {transaction.status === 'paid' ? '+' : ''} {formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {transaction.payment_method}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <CardTitle>Gestão de Mensalidades</CardTitle>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-[300px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar aluno..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Em Dia</SelectItem>
                      <SelectItem value="due_soon">Vence em Breve</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 font-medium text-sm">
                  <div className="col-span-4">Aluno</div>
                  <div className="col-span-2">Plano</div>
                  <div className="col-span-2">Valor</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Ações</div>
                </div>
                <div className="divide-y">
                  {filteredStudents.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Nenhum aluno encontrado com os filtros atuais.
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <div key={student.id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm hover:bg-muted/50 transition-colors">
                        <div className="col-span-4">
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.email}</div>
                        </div>
                        <div className="col-span-2">
                          <Badge variant="outline">{student.planName}</Badge>
                        </div>
                        <div className="col-span-2 font-medium">
                          {formatCurrency(student.amount)}
                        </div>
                        <div className="col-span-2">
                          <Badge className={getStatusColor(student.paymentStatus)}>
                            {getStatusLabel(student.paymentStatus)}
                          </Badge>
                          {student.nextPaymentDate && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Vence: {new Date(student.nextPaymentDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="col-span-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setIsManualPaymentOpen(true);
                              }}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Registrar Pagamento
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                Ver Histórico
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openSubscriptionAction(student.user_id, student.name, 'pause')}
                              >
                                <PauseCircle className="mr-2 h-4 w-4" />
                                Pausar Assinatura
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => openSubscriptionAction(student.user_id, student.name, 'cancel')}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar Assinatura
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* Modals */}
      <ManualPaymentModal
        isOpen={isManualPaymentOpen}
        onClose={() => setIsManualPaymentOpen(false)}
        onSuccess={() => {
          setIsManualPaymentOpen(false);
          smartRefresh(true);
        }}
      />

      <ManualChargeModal
        isOpen={manualChargeModalOpen}
        onClose={() => setManualChargeModalOpen(false)}
        students={studentsWithPayments.map(s => ({
          id: s.user_id || s.id,
          name: s.name,
          email: s.email,
          phone: (s as any).profiles?.phone || ''
        }))}
        plans={[]} // Plans should be fetched from context or passed down
        teacherId={userId || ''}
        onChargeCreated={() => {
          setManualChargeModalOpen(false);
          smartRefresh(true);
        }}
      />

      <ManageChargesModal
        isOpen={manageChargesModalOpen}
        onClose={() => setManageChargesModalOpen(false)}
        teacherId={userId || ''}
      />

      <SubscriptionActionDialog
        isOpen={subscriptionAction.isOpen}
        onClose={() => setSubscriptionAction(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleSubscriptionAction}
        action={subscriptionAction.type}
        studentName={subscriptionAction.studentName}
        loading={actionLoading}
      />
    </div>
  );
}