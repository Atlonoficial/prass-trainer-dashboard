import { useCallback, useMemo } from 'react';
import { usePaymentContext } from '@/contexts/PaymentContext';

/**
 * Stable wrapper for PaymentContext to prevent unnecessary re-renders
 * This hook provides memoized values and stable function references
 */
export function useStablePaymentContext() {
  const context = usePaymentContext();

  // Memoize data to prevent unnecessary re-renders
  const stableData = useMemo(() => ({
    transactions: context.transactions,
    metrics: context.metrics,
    settings: context.settings,
    loading: context.loading,
    error: context.error
  }), [
    context.transactions.length,
    context.metrics?.total_revenue,
    context.settings?.id,
    context.loading.transactions,
    context.loading.metrics,
    context.loading.settings,
    context.loading.actions,
    context.error
  ]);

  // Stable function references
  const stableFunctions = useMemo(() => ({
    fetchTransactions: context.fetchTransactions,
    fetchMetrics: context.fetchMetrics,
    fetchSettings: context.fetchSettings,
    saveSettings: context.saveSettings,
    deleteSettings: context.deleteSettings,
    createCheckout: context.createCheckout,
    clearCache: context.clearCache,
    isStale: context.isStale
  }), [
    context.fetchTransactions,
    context.fetchMetrics,
    context.fetchSettings,
    context.saveSettings,
    context.deleteSettings,
    context.createCheckout,
    context.clearCache,
    context.isStale
  ]);

  // Smart refresh function with debouncing
  const refreshIfStale = useCallback(async () => {
    const promises = [];
    
    if (context.isStale('transactions')) {
      promises.push(context.fetchTransactions(true));
    }
    
    if (context.isStale('metrics')) {
      promises.push(context.fetchMetrics(true));
    }
    
    if (context.isStale('settings')) {
      promises.push(context.fetchSettings(true));
    }

    if (promises.length > 0) {
      try {
        await Promise.all(promises);
      } catch (error) {
        console.error('[StablePaymentContext] Error refreshing stale data:', error);
      }
    }
  }, [context.fetchTransactions, context.fetchMetrics, context.fetchSettings, context.isStale]);

  return {
    ...stableData,
    ...stableFunctions,
    refreshIfStale
  };
}