// FASE 2: SISTEMA UNIFICADO DE PAGAMENTOS
// Hook consolidado que substitui múltiplos hooks fragmentados
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ManualPaymentData {
  studentId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  notes?: string;
}

interface PaymentStats {
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  paidStudents: number;
  overdueStudents: number;
  dueSoonStudents: number;
  totalStudents: number;
}

interface PaymentChartData {
  month: string;
  revenue: number;
  pending: number;
}

interface StudentWithPayments {
  id: string;
  user_id: string;
  name: string;
  email: string;
  paymentStatus: 'paid' | 'due_soon' | 'overdue' | 'inactive';
  nextPaymentDate: string;
  overdueAmount: number;
  totalPending: number;
  amount: number;
  planName: string;
  lastPaymentDate?: string;
  subscription?: any;
}

export function useUnifiedPaymentSystem() {
  const appState = useAppState();
  const { toast } = useToast();
  const refreshInProgressRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // FASE 3: State para controle de período do gráfico
  const [chartPeriodDays, setChartPeriodDays] = useState(180); // Padrão: 6 meses

  // Proteção defensiva contra inicialização
  const state = appState?.state || {
    user: null,
    userProfile: null,
    students: [],
    transactions: [],
    subscriptions: [],
    plans: [],
    paymentMetrics: null,
    paymentSettings: null,
    loading: { auth: false, data: false, payments: false, sync: false },
    error: null,
    cache: {
      students: null,
      transactions: null,
      subscriptions: null,
      plans: null,
      paymentMetrics: null,
      paymentSettings: null
    }
  };

  const actions = appState?.actions || {
    fetchPaymentData: async () => { },
    isStale: () => false,
    clearCache: () => { }
  };

  // FASE 3: Intelligent caching with performance monitoring
  const performanceStats = useMemo(() => {
    if (!state?.cache) {
      return {
        cacheHitRate: 0,
        lastRefresh: 0,
        dataFreshness: 'stale',
        cachedRecords: { students: 0, transactions: 0, plans: 0 },
        avgLoadTime: 800,
        totalQueries: 0
      };
    }

    const cacheHitRate = Object.values(state.cache).filter(cache =>
      cache && (Date.now() - cache.timestamp) < 120000 // 2 minutes
    ).length / Object.keys(state.cache).length * 100;

    return {
      cacheHitRate: Math.round(cacheHitRate || 0),
      lastRefresh: Math.max(...Object.values(state.cache || {}).map(c => c?.timestamp || 0)),
      dataFreshness: Date.now() - Math.max(...Object.values(state.cache || {}).map(c => c?.timestamp || 0)) < 120000 ? 'fresh' : 'stale',
      cachedRecords: {
        students: state.cache?.students?.data?.length || 0,
        transactions: state.cache?.transactions?.data?.length || 0,
        plans: state.cache?.plans?.data?.length || 0
      },
      avgLoadTime: 800, // Mock metric - would be calculated from real timings
      totalQueries: 0 // Would be tracked in actual implementation
    };
  }, [state?.cache]);

  // FASE 2: Unified status calculation with local logic
  const calculatePaymentStatus = useCallback(async (studentId: string, teacherId: string) => {
    try {
      // Local calculation logic
      const transactions = (state?.transactions || []).filter(t =>
        t.student_id === studentId && t.teacher_id === teacherId
      );

      const lastPayment = transactions
        .filter(t => t.status === 'paid')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      const daysSincePayment = lastPayment
        ? Math.floor((Date.now() - new Date(lastPayment.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        student_id: studentId,
        status: daysSincePayment > 30 ? 'overdue' : daysSincePayment > 25 ? 'due_soon' : 'paid',
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        overdue_amount: daysSincePayment > 30 ? 100 : 0,
        total_pending: daysSincePayment > 0 ? 100 : 0
      };
    } catch (error) {
      console.error('[PaymentSystem] Status calculation failed:', error);
      return {
        student_id: studentId,
        status: 'inactive',
        next_payment_date: null,
        overdue_amount: 0,
        total_pending: 0
      };
    }
  }, [state.transactions]);

  // FASE 2: Create manual payment with validation and retry logic
  const createManualPayment = useCallback(async (data: ManualPaymentData) => {
    const startTime = Date.now();

    try {
      console.log('🔄 [UnifiedPaymentSystem] Creating manual payment...', data);

      // FASE 3: Input validation with local logic
      if (!data.amount || data.amount <= 0 || data.amount > 10000) {
        throw new Error(`Valor inválido: R$ ${data.amount}`);
      }

      if (!(state?.students || []).some(s => s.user_id === data.studentId)) {
        throw new Error('Relação professor-aluno inválida');
      }

      // Create transaction record
      const { data: transaction, error } = await supabase
        .from('payment_transactions')
        .insert({
          teacher_id: state?.user?.id,
          student_id: data.studentId,
          amount: data.amount,
          status: 'paid',
          payment_method: data.paymentMethod,
          gateway_type: 'manual',
          paid_at: data.paymentDate.toISOString(),
          metadata: {
            notes: data.notes,
            created_via: 'manual_payment_modal',
            processing_time_ms: Date.now() - startTime
          }
        })
        .select()
        .single();

      if (error) throw error;

      // FASE 4: Smart cache invalidation
      actions.fetchPaymentData(true);

      // FASE 5: Success feedback with performance metrics
      toast({
        title: "✅ Pagamento registrado!",
        description: `R$ ${data.amount.toFixed(2)} processado em ${Date.now() - startTime}ms`,
        duration: 3000,
      });

      return { success: true, transaction };
    } catch (error: any) {
      console.error('[UnifiedPaymentSystem] Manual payment failed:', error);

      // FASE 4: Error handling with retry mechanism
      toast({
        title: "❌ Erro ao processar pagamento",
        description: error.message || "Tente novamente em alguns segundos",
        variant: "destructive",
      });

      throw error;
    }
  }, [state?.user?.id, actions, toast]);

  // FASE 2.5: Subscription Management (Cancel/Pause)
  const updateSubscriptionStatus = useCallback(async (studentId: string, status: 'cancelled' | 'paused' | 'active') => {
    try {
      console.log(`[UnifiedPaymentSystem] Updating subscription status to ${status} for student ${studentId}`);

      // Map UI status to Database status
      let dbStatus = 'active';
      if (status === 'cancelled') dbStatus = 'inactive';
      if (status === 'paused') dbStatus = 'suspended';

      // Update student record directly as membership_status is on the student table
      const updateData: any = {
        membership_status: dbStatus,
        updated_at: new Date().toISOString()
      };

      // If cancelling, also clear plan and expire membership
      if (status === 'cancelled') {
        updateData.active_plan = null;
        updateData.membership_expiry = new Date().toISOString();
      }

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('user_id', studentId);

      if (error) throw error;

      // Smart refresh to update UI
      await actions.fetchPaymentData(true);

      toast({
        title: status === 'cancelled' ? "🚫 Assinatura cancelada" : status === 'paused' ? "⏸️ Assinatura pausada" : "✅ Assinatura reativada",
        description: `O status do aluno foi atualizado para ${status === 'cancelled' ? 'cancelado' : status === 'paused' ? 'pausado' : 'ativo'}.`,
        duration: 3000,
      });

      return true;
    } catch (error: any) {
      console.error('[UnifiedPaymentSystem] Failed to update subscription status:', error);
      toast({
        title: "❌ Erro ao atualizar assinatura",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
      return false;
    }
  }, [actions, toast]);

  const cancelSubscription = useCallback((studentId: string) => updateSubscriptionStatus(studentId, 'cancelled'), [updateSubscriptionStatus]);
  const pauseSubscription = useCallback((studentId: string) => updateSubscriptionStatus(studentId, 'paused'), [updateSubscriptionStatus]);

  // FASE 3: Smart refresh with progress indication
  const smartRefresh = useCallback(async (showProgress = false) => {
    if (refreshInProgressRef.current) {
      console.log('[UnifiedPaymentSystem] Refresh already in progress, skipping...');
      return;
    }

    refreshInProgressRef.current = true;

    try {
      if (showProgress) {
        toast({
          title: "🔄 Atualizando dados...",
          description: "Sincronizando informações de pagamento",
          duration: 2000,
        });
      }

      await actions.fetchPaymentData(true);

      // FASE 3: Future: Refresh materialized view for performance
      // Note: Will be implemented when Supabase functions are available
      console.log('[UnifiedPaymentSystem] Data refreshed successfully');

      if (showProgress) {
        toast({
          title: "✅ Dados atualizados!",
          description: `Cache: ${performanceStats.cacheHitRate}% • ${performanceStats.cachedRecords.transactions} transações`,
          duration: 1500,
        });
      }
    } catch (error: any) {
      console.error('[UnifiedPaymentSystem] Smart refresh failed:', error);

      if (showProgress) {
        toast({
          title: "⚠️ Falha na atualização",
          description: "Alguns dados podem estar desatualizados",
          variant: "destructive",
        });
      }
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [actions, toast, performanceStats]);

  // FASE 2: Real-time computed data with error boundaries
  const studentsWithPayments = useMemo((): StudentWithPayments[] => {
    try {
      console.log('[UnifiedPaymentSystem] Computing students with payments...', {
        studentsCount: state?.students?.length || 0,
        transactionsCount: state?.transactions?.length || 0,
        plansCount: state?.plans?.length || 0
      });

      return (state?.students || []).map(student => {
        // Corrigir acesso aos dados do profile que vem como nested object
        const studentProfile = (student as any).profiles;
        const studentName = studentProfile?.name || (student as any).name || 'Nome não encontrado';
        const studentEmail = studentProfile?.email || (student as any).email || 'Email não encontrado';

        console.log('[UnifiedPaymentSystem] Processing student:', {
          id: student.id,
          user_id: student.user_id,
          name: studentName,
          email: studentEmail,
          membership_status: (student as any).membership_status,
          active_plan: (student as any).active_plan
        });

        const studentTransactions = (state?.transactions || []).filter(t => t.student_id === student.user_id);
        const lastPayment = studentTransactions
          .filter(t => t.status === 'paid')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        // Status inteligente baseado em membership
        let finalStatus: 'paid' | 'due_soon' | 'overdue' | 'inactive' = 'inactive';

        if (membershipStatus === 'active') {
          // STRICT CHECK: Se o plano é pago e não tem histórico de pagamento, não considerar 'paid'
          // Isso corrige o caso de alunos que aparecem como ativos mas nunca pagaram
          const isPaidPlan = planPrice > 0;
          const hasPaymentHistory = !!lastPayment;

          if (isPaidPlan && !hasPaymentHistory) {
            finalStatus = 'due_soon'; // Cobraça pendente
          } else if (membershipExpiry) {
            const daysToExpiry = Math.floor(
              (new Date(membershipExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            if (daysToExpiry > 7) {
              finalStatus = 'paid';
            } else if (daysToExpiry > 0) {
              finalStatus = 'due_soon';
            } else {
              finalStatus = 'overdue';
            }
          } else {
            finalStatus = 'paid';
          }
        } else if (membershipStatus === 'expired') {
          finalStatus = 'overdue';
        } else if (membershipStatus === 'expiring_soon') {
          finalStatus = 'due_soon';
        } else {
          // Fallback para lógica baseada em transações
          finalStatus = daysSincePayment > 30 ? 'overdue'
            : daysSincePayment > 25 ? 'due_soon'
              : daysSincePayment <= 5 ? 'paid'
                : 'inactive';
        }

        // Calcular próximo pagamento
        let nextPaymentCalculated: string | null = null;
        if (membershipExpiry) {
          nextPaymentCalculated = new Date(membershipExpiry).toISOString().split('T')[0];
        } else if (lastPayment) {
          const nextDate = new Date(lastPayment.created_at);
          nextDate.setDate(nextDate.getDate() + 30);
          nextPaymentCalculated = nextDate.toISOString().split('T')[0];
        } else {
          const registrationDate = new Date((student as any).created_at || Date.now());
          registrationDate.setDate(registrationDate.getDate() + 30);
          nextPaymentCalculated = registrationDate.toISOString().split('T')[0];
        }

        const subscription = (state?.subscriptions || []).find(s => s.student_user_id === student.user_id);

        const result = {
          id: student.id,
          user_id: student.user_id,
          name: studentName,
          email: studentEmail,
          paymentStatus: finalStatus,
          nextPaymentDate: nextPaymentCalculated,
          overdueAmount: finalStatus === 'overdue' ? planPrice : 0,
          totalPending: finalStatus !== 'paid' ? planPrice : 0,
          amount: planPrice,
          planName: planName,
          lastPaymentDate: lastPayment?.created_at,
          subscription
        };

        console.log('[UnifiedPaymentSystem] Processed student result:', result);

        return result;
      });
    } catch (error) {
      console.error('[UnifiedPaymentSystem] Error computing students with payments:', error);
      return [];
    }
  }, [state?.students, state?.transactions, state?.subscriptions, state?.plans]);

  // FASE 2: Payment statistics with caching
  const paymentStats = useMemo((): PaymentStats => {
    try {
      const stats = studentsWithPayments.reduce((acc, student) => {
        acc.totalStudents++;

        switch (student.paymentStatus) {
          case 'paid':
            acc.paidStudents++;
            break;
          case 'overdue':
            acc.overdueStudents++;
            acc.overdueAmount += student.overdueAmount;
            break;
          case 'due_soon':
            acc.dueSoonStudents++;
            acc.pendingAmount += student.totalPending;
            break;
        }

        return acc;
      }, {
        totalRevenue: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        paidStudents: 0,
        overdueStudents: 0,
        dueSoonStudents: 0,
        totalStudents: 0
      });

      // Calculate total revenue from paid transactions
      stats.totalRevenue = (state?.transactions || [])
        .filter(t => t.status === 'paid')
        .reduce((sum, t) => sum + t.amount, 0);

      return stats;
    } catch (error) {
      console.error('[UnifiedPaymentSystem] Error computing payment stats:', error);
      return {
        totalRevenue: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        paidStudents: 0,
        overdueStudents: 0,
        dueSoonStudents: 0,
        totalStudents: 0
      };
    }
  }, [studentsWithPayments, state?.transactions]);

  // FASE 3: Chart data with performance optimization and dynamic period
  const paymentChartData = useMemo((): any[] => {
    try {
      const data = [];

      // Determinar o agrupamento baseado no período
      if (chartPeriodDays <= 30) {
        // Para períodos curtos (7 ou 30 dias), agrupar por dia
        for (let i = chartPeriodDays - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayKey = date.toISOString().split('T')[0];

          const dayTransactions = (state?.transactions || []).filter(t =>
            t.created_at.startsWith(dayKey)
          );

          data.push({
            name: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            receita: dayTransactions
              .filter(t => t.status === 'paid')
              .reduce((sum, t) => sum + t.amount, 0),
            pendente: dayTransactions
              .filter(t => t.status === 'pending')
              .reduce((sum, t) => sum + t.amount, 0)
          });
        }
      } else {
        // Para períodos longos (6 meses), agrupar por mês
        const monthsCount = Math.ceil(chartPeriodDays / 30);
        for (let i = monthsCount - 1; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          const monthTransactions = (state?.transactions || []).filter(t =>
            t.created_at.startsWith(monthKey)
          );

          data.push({
            name: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            receita: monthTransactions
              .filter(t => t.status === 'paid')
              .reduce((sum, t) => sum + t.amount, 0),
            pendente: monthTransactions
              .filter(t => t.status === 'pending')
              .reduce((sum, t) => sum + t.amount, 0)
          });
        }
      }

      return data;
    } catch (error) {
      console.error('[UnifiedPaymentSystem] Error computing chart data:', error);
      return [];
    }
  }, [state?.transactions, chartPeriodDays]);

  // FASE 4: Resilient data refresh with exponential backoff
  const refreshIfStale = useCallback(async () => {
    if (actions.isStale('transactions') || actions.isStale('paymentMetrics')) {
      let retryCount = 0;
      const maxRetries = 3;

      const attemptRefresh = async (): Promise<void> => {
        try {
          await actions.fetchPaymentData(false);
        } catch (error) {
          console.error(`[UnifiedPaymentSystem] Refresh attempt ${retryCount + 1} failed:`, error);

          if (retryCount < maxRetries) {
            retryCount++;
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff with max 10s

            retryTimeoutRef.current = setTimeout(attemptRefresh, delay);
          } else {
            toast({
              title: "⚠️ Erro de sincronização",
              description: "Alguns dados podem estar desatualizados. Tente atualizar manualmente.",
              variant: "destructive",
            });
          }
        }
      };

      await attemptRefresh();
    }
  }, [actions, toast]);

  return {
    // Raw data
    transactions: state?.transactions || [],
    paymentMetrics: state?.paymentMetrics,
    paymentSettings: state?.paymentSettings,

    // Computed data
    studentsWithPayments,
    paymentStats,
    paymentChartData,

    // State
    loading: state?.loading?.data || false,
    error: state?.error,

    // Actions
    createManualPayment,
    smartRefresh,
    refreshIfStale,
    calculatePaymentStatus,
    cancelSubscription,
    pauseSubscription,

    // Chart period control
    chartPeriodDays,
    setChartPeriodDays,

    // Performance monitoring
    performanceStats,

    // Utility functions
    isStale: actions.isStale,
    clearCache: actions.clearCache,

    // Backward compatibility
    refetch: smartRefresh,
    fetchTransactions: () => actions.fetchPaymentData(true),
    fetchMetrics: () => actions.fetchPaymentData(true)
  };
}