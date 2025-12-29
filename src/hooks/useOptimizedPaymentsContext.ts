// Optimized Payments Hook using AppStateProvider
import { useAppState } from '@/hooks/useAppState'
import { useCallback } from 'react'

export function useOptimizedPaymentsContext() {
  const { state, actions } = useAppState()
  
  const refreshPayments = useCallback(async () => {
    console.log('🔄 useOptimizedPayments: Refreshing payment data...');
    await actions.fetchPaymentData(true);
  }, [actions]);

  const createManualPayment = useCallback(async (data: {
    studentId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    notes?: string;
  }) => {
    console.log('💳 useOptimizedPayments: Creating manual payment', data);
    
    // TODO: Implement manual payment creation via Supabase
    // For now, just refresh the data
    await refreshPayments();
    return { success: true };
  }, [refreshPayments]);

  const updatePaymentStatus = useCallback(async (transactionId: string, status: string) => {
    console.log('📝 useOptimizedPayments: Updating payment status', transactionId, status);
    
    // TODO: Implement payment status update via Supabase
    // For now, just refresh the data
    await refreshPayments();
    return { success: true };
  }, [refreshPayments]);
  
  return {
    // Core data
    transactions: state.transactions || [],
    metrics: state.paymentMetrics || null,
    settings: state.paymentSettings || null,
    
    // Loading states - intelligent loading based on data existence
    loading: {
      transactions: state.loading.data && (!state.transactions || state.transactions.length === 0),
      metrics: state.loading.data && !state.paymentMetrics,
      settings: state.loading.data && !state.paymentSettings,
      actions: false
    },
    
    // Error handling
    error: state.error,
    
    // Actions
    createManualPayment,
    updatePaymentStatus,
    refreshPayments,
    
    // Refresh functions
    refreshAll: refreshPayments,
    refreshIfStale: () => actions.fetchPaymentData(false),
    clearCache: actions.clearCache,
    
    // Backward compatibility
    fetchTransactions: refreshPayments,
    fetchMetrics: refreshPayments,
    fetchSettings: refreshPayments
  }
}