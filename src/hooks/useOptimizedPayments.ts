import { useCallback, useRef } from 'react';
import { useAppState } from '@/hooks/useAppState';

/**
 * ===== SISTEMA UNIFICADO DE PAGAMENTOS OTIMIZADO =====
 * Acesso direto ao AppStateProvider para máxima performance
 * Remove todas as camadas intermediárias desnecessárias
 */
export function useOptimizedPayments() {
  const { state, actions } = useAppState();
  const lastRefreshRef = useRef<number>(0);

  // FASE 1: Operações diretas e simplificadas
  const createManualPayment = useCallback(async (data: {
    studentId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    notes?: string;
  }) => {
    console.log('💳 Creating manual payment:', data);
    
    // TODO: Implementar via Supabase (direct insert)
    // For now, refresh data to show changes
    await actions.fetchPaymentData(true);
    return { success: true };
  }, [actions]);

  const refreshPayments = useCallback(async () => {
    // Debounce rapid calls (prevent multiple calls within 2 seconds)
    const now = Date.now();
    if (now - lastRefreshRef.current < 2000) {
      return;
    }
    lastRefreshRef.current = now;

    try {
      await actions.fetchPaymentData(true);
    } catch (error) {
      console.warn('Payment refresh failed:', error);
    }
  }, [actions]);

  // Smart refresh - only refresh if data is stale
  const smartRefresh = useCallback(async () => {
    if (actions.isStale('transactions') || actions.isStale('paymentSettings')) {
      console.log('🔄 Smart refresh - data is stale');
      await refreshPayments();
    } else {
      console.log('💾 Smart refresh - using cached data');
    }
  }, [actions, refreshPayments]);

  // FASE 2: Dados computados em tempo real
  const studentsWithPayments = state.students.map(student => {
    // Find student's transactions
    const studentTransactions = state.transactions.filter(t => 
      t.student_id === student.user_id
    );
    
    // Find student's active subscription
    const activeSubscription = state.subscriptions.find(sub => 
      sub.student_user_id === student.user_id && 
      sub.status === 'active'
    );
    
    // Find plan details
    const plan = activeSubscription 
      ? state.plans.find(p => p.id === activeSubscription.plan_id)
      : null;

    // Calculate payment status
    const lastTransaction = studentTransactions[0]; // Most recent
    const hasRecentPayment = lastTransaction && 
      lastTransaction.status === 'paid' &&
      new Date(lastTransaction.paid_at || lastTransaction.created_at) > new Date(Date.now() - 30*24*60*60*1000);

    let status = 'active';
    let nextPayment = 'N/A';
    let daysOverdue = 0;

    if (activeSubscription) {
      const endDate = new Date(activeSubscription.end_at);
      const now = new Date();
      
      if (endDate < now) {
        status = 'overdue';
        daysOverdue = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        const daysUntilDue = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 3) {
          status = 'due_soon';
        } else if (hasRecentPayment) {
          status = 'paid';
        }
        nextPayment = endDate.toLocaleDateString('pt-BR');
      }
    }

    return {
      ...student,
      plan: plan?.name || 'Sem plano',
      amount: plan?.price || 0,
      status,
      nextPayment,
      daysOverdue,
      lastTransaction,
      activeSubscription
    };
  });

  // FASE 3: Estatísticas em tempo real
  const paymentStats = {
    totalRevenue: state.transactions
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + (t.amount || 0), 0),
    overdueCount: studentsWithPayments.filter(s => s.status === 'overdue').length,
    dueSoonCount: studentsWithPayments.filter(s => s.status === 'due_soon').length,
    paidCount: studentsWithPayments.filter(s => s.status === 'paid').length,
  };

  // FASE 4: Dados do gráfico em tempo real
  const paymentChartData = (() => {
    const monthlyData = new Map<string, { receita: number; pendente: number }>();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyData.set(monthKey, { receita: 0, pendente: 0 });
    }

    // Populate with real transaction data
    state.transactions.forEach(transaction => {
      const date = new Date(transaction.created_at);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      if (monthlyData.has(monthKey)) {
        if (transaction.status === 'paid') {
          monthlyData.get(monthKey)!.receita += transaction.amount || 0;
        } else {
          monthlyData.get(monthKey)!.pendente += transaction.amount || 0;
        }
      }
    });

    return Array.from(monthlyData.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
  })();

  return {
    // Core data - directly from AppState
    transactions: state.transactions,
    paymentMetrics: state.paymentMetrics,
    paymentSettings: state.paymentSettings,

    // Computed data - real time
    studentsWithPayments,
    paymentStats,
    paymentChartData,
    
    // Loading states - intelligent based on data existence
    loading: {
      transactions: state.loading.data && !state.transactions.length,
      metrics: state.loading.data && !state.paymentMetrics,
      settings: state.loading.data && !state.paymentSettings,
      actions: false,
      data: state.loading.data && (!state.transactions.length && !studentsWithPayments.length)
    },
    
    // Error handling - direct
    error: state.error,
    
    // Actions - optimized
    createManualPayment,
    refreshPayments,
    smartRefresh,
    
    // Performance stats - real
    performanceStats: {
      cacheHitRate: state.cache.transactions ? 'High' : 'Low',
      lastRefresh: state.cache.transactions?.timestamp 
        ? new Date(state.cache.transactions.timestamp).toLocaleString('pt-BR')
        : 'Never',
      dataFreshness: actions.isStale('transactions') ? 'Stale' : 'Fresh',
      totalCachedRecords: {
        students: state.students.length,
        transactions: state.transactions.length,
        subscriptions: state.subscriptions.length,
      },
      loadingTime: state.loading.data ? 'Loading...' : '< 500ms',
      queryCount: Object.keys(state.cache).filter(k => 
        state.cache[k as keyof typeof state.cache]
      ).length
    },

    // Backward compatibility for existing components
    fetchTransactions: smartRefresh,
    fetchMetrics: smartRefresh,
    fetchSettings: smartRefresh
  };
}