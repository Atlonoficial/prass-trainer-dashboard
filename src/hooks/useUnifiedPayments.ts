import { useCallback, useMemo } from 'react';
import { useOptimizedPaymentsContext } from './useOptimizedPaymentsContext';
import { useToast } from './use-toast';
import { useAppState } from '@/hooks/useAppState';

/**
 * ===== SISTEMA UNIFICADO DE PAGAMENTOS =====
 * Sistema integrado com AppStateProvider para máxima performance
 * Substitui todos os hooks fragmentados anteriores
 */
export function useUnifiedPayments() {
  const { state, actions } = useAppState();
  const { 
    transactions, 
    metrics, 
    settings, 
    loading, 
    error,
    createManualPayment: contextCreatePayment,
    updatePaymentStatus: contextUpdateStatus,
    refreshPayments
  } = useOptimizedPaymentsContext();
  const { toast } = useToast();

  // FASE 2: Consolidated payment operations (FIXED: Using context methods)
  const createManualPayment = useCallback(async (data: {
    studentId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    notes?: string;
  }) => {
      return await contextCreatePayment(data);
    }, [contextCreatePayment]);

    // Get payment metrics with caching
    const getPaymentMetrics = useCallback(async (forceRefresh = false) => {
      if (!forceRefresh && metrics && !actions.isStale('paymentMetrics')) {
        return metrics;
      }
      
      await actions.fetchPaymentData(true);
      return state.paymentMetrics;
    }, [metrics, actions, state.paymentMetrics]);

    // Update payment status  
    const updatePaymentStatus = useCallback(async (transactionId: string, status: string) => {
      return await contextUpdateStatus(transactionId, status);
    }, [contextUpdateStatus]);

  // FASE 3: Optimized refresh functions (FIXED: Using context methods)
  const refreshIfStaleOptimized = useCallback(async () => {
    const start = performance.now();
    await refreshPayments();
    const end = performance.now();
    
    if (end - start > 2000) {
      console.warn('[UnifiedPayments] Slow refresh detected:', end - start, 'ms');
    }
  }, [refreshPayments]);

  const forceRefreshOptimized = useCallback(async () => {
    const start = performance.now();
    await actions.fetchPaymentData(true);
    const end = performance.now();
    
    if (end - start > 2000) {
      console.warn('[UnifiedPayments] Slow force refresh detected:', end - start, 'ms');
    }
  }, [actions]);

  // FASE 3: Smart refresh that shows immediate feedback
  const smartRefresh = useCallback(async (showToast = true) => {
    if (showToast) {
      toast({
        title: "🔄 Atualizando dados...",
        description: "Carregando informações mais recentes",
        duration: 1000,
      });
    }

    try {
      await actions.fetchPaymentData(true);
      
      if (showToast) {
        toast({
          title: "✅ Dados atualizados!",
          description: "Informações de pagamento sincronizadas",
          duration: 2000,
        });
      }
    } catch (error) {
      if (showToast) {
        toast({
          title: "❌ Erro na atualização",
          description: "Não foi possível atualizar os dados",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  }, [actions, toast]);

  // FASE 2: Unified data structure
  const unifiedData = useMemo(() => ({
    // Raw data
    students: state.students,
    plans: state.plans,
    subscriptions: state.subscriptions,
    transactions: transactions,
    paymentMetrics: metrics,
    paymentSettings: settings,
    
    // Computed data (simplified)
    studentsWithPayments: state.students.map(student => ({
      ...student,
      amount: 0, // Will be computed from transactions
      status: 'active',
      nextPayment: new Date().toLocaleDateString(),
      daysOverdue: 0
    })),
    paymentStats: {
      totalRevenue: transactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + (t.amount || 0), 0),
      overdueCount: 0,
      dueSoonCount: 0,
      paidCount: transactions.filter(t => t.status === 'paid').length,
    },
    paymentChartData: [], // Will be computed from transactions
    
    // Status
    loading,
    error,
    isStale: actions.isStale,
    
    // Quick stats
    totalTransactions: transactions.length,
    paidTransactions: transactions.filter(t => t.status === 'paid').length,
    pendingTransactions: transactions.filter(t => t.status === 'pending').length,
    totalRevenue: transactions
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + (t.amount || 0), 0),
  }), [
    state.students,
    state.plans, 
    state.subscriptions,
    transactions,
    metrics,
    settings,
    loading,
    error,
    actions.isStale
  ]);

  // FASE 3: Optimized actions object (FIXED: No longer using useMemo with nested hooks)
  const optimizedActions = useMemo(() => ({
    refreshIfStale: refreshIfStaleOptimized,
    forceRefresh: forceRefreshOptimized,
    smartRefresh
  }), [refreshIfStaleOptimized, forceRefreshOptimized, smartRefresh]);

  // FASE 4: Performance monitoring simplificado
  const performanceStats = useMemo(() => ({
    cacheHitRate: state.cache.transactions ? 'High' : 'Low',
    lastRefresh: state.cache.transactions?.timestamp 
      ? new Date(state.cache.transactions.timestamp).toISOString()
      : 'Never',
    dataFreshness: actions.isStale('transactions') ? 'Stale' : 'Fresh',
    totalCachedRecords: {
      students: state.cache.students?.data.length || 0,
      transactions: state.cache.transactions?.data.length || 0,
      subscriptions: state.cache.subscriptions?.data.length || 0,
    },
    loadingTime: loading.transactions ? 'Loading...' : '< 1s',
    queryCount: Object.keys(state.cache).filter(k => state.cache[k as keyof typeof state.cache]).length
  }), [state.cache, actions, loading]);

  return {
    // FASE 2: Unified data
    ...unifiedData,
    
    // FASE 2: Consolidated operations (FIXED: Individual methods instead of spread)
    createManualPayment,
    getPaymentMetrics, 
    updatePaymentStatus,
    
    // FASE 3: Optimized actions
    ...optimizedActions,
    
    // FASE 4: Performance monitoring
    performanceStats,
    
    // Backward compatibility for existing components
    payments: transactions,
    refetch: optimizedActions.refreshIfStale,
    fetchTransactions: optimizedActions.refreshIfStale,
    fetchMetrics: optimizedActions.refreshIfStale,
  };
}