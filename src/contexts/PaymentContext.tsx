import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherAuth } from '@/hooks/useTeacherAuth';
import { useToast } from '@/hooks/use-toast';
import { usePaymentResilience } from '@/hooks/usePaymentResilience';
import type { PaymentTransaction } from '@/hooks/usePaymentProcessing';

// Types
interface PaymentMetrics {
  total_revenue: number;
  paid_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  transactions_by_month: Record<string, number>;
  revenue_by_month: Record<string, number>;
}

interface TeacherPaymentSettings {
  id?: string;
  teacher_id: string;
  gateway_type: string;
  credentials: any;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PaymentState {
  transactions: PaymentTransaction[];
  metrics: PaymentMetrics | null;
  settings: TeacherPaymentSettings | null;
  loading: {
    transactions: boolean;
    metrics: boolean;
    settings: boolean;
    actions: boolean;
  };
  error: string | null;
  cache: {
    transactions: { data: PaymentTransaction[]; timestamp: number; };
    metrics: { data: PaymentMetrics | null; timestamp: number; };
    settings: { data: TeacherPaymentSettings | null; timestamp: number; };
  };
}

type PaymentAction =
  | { type: 'SET_LOADING'; payload: { key: keyof PaymentState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TRANSACTIONS'; payload: { data: PaymentTransaction[]; fromCache?: boolean } }
  | { type: 'SET_METRICS'; payload: { data: PaymentMetrics | null; fromCache?: boolean } }
  | { type: 'SET_SETTINGS'; payload: { data: TeacherPaymentSettings | null; fromCache?: boolean } }
  | { type: 'CLEAR_CACHE' };

interface PaymentContextType extends PaymentState {
  fetchTransactions: (force?: boolean) => Promise<void>;
  fetchMetrics: (force?: boolean) => Promise<void>;
  fetchSettings: (force?: boolean) => Promise<void>;
  saveSettings: (settings: Partial<TeacherPaymentSettings>) => Promise<void>;
  deleteSettings: () => Promise<void>;
  createCheckout: (servicePricingId?: string, courseId?: string, paymentMethod?: string) => Promise<any>;
  clearCache: () => void;
  isStale: (key: 'transactions' | 'metrics' | 'settings') => boolean;
}

const PaymentContext = createContext<PaymentContextType | null>(null);

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

const initialState: PaymentState = {
  transactions: [],
  metrics: null,
  settings: null,
  loading: {
    transactions: false,
    metrics: false,
    settings: false,
    actions: false
  },
  error: null,
  cache: {
    transactions: { data: [], timestamp: 0 },
    metrics: { data: null, timestamp: 0 },
    settings: { data: null, timestamp: 0 }
  }
};

function paymentReducer(state: PaymentState, action: PaymentAction): PaymentState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_TRANSACTIONS':
      const transactionsTimestamp = action.payload.fromCache ? state.cache.transactions.timestamp : Date.now();
      return {
        ...state,
        transactions: action.payload.data,
        cache: {
          ...state.cache,
          transactions: { data: action.payload.data, timestamp: transactionsTimestamp }
        }
      };
    case 'SET_METRICS':
      const metricsTimestamp = action.payload.fromCache ? state.cache.metrics.timestamp : Date.now();
      return {
        ...state,
        metrics: action.payload.data,
        cache: {
          ...state.cache,
          metrics: { data: action.payload.data, timestamp: metricsTimestamp }
        }
      };
    case 'SET_SETTINGS':
      const settingsTimestamp = action.payload.fromCache ? state.cache.settings.timestamp : Date.now();
      return {
        ...state,
        settings: action.payload.data,
        cache: {
          ...state.cache,
          settings: { data: action.payload.data, timestamp: settingsTimestamp }
        }
      };
    case 'CLEAR_CACHE':
      return {
        ...state,
        cache: {
          transactions: { data: [], timestamp: 0 },
          metrics: { data: null, timestamp: 0 },
          settings: { data: null, timestamp: 0 }
        }
      };
    default:
      return state;
  }
}

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(paymentReducer, initialState);
  const { userId, isTeacher, loading: authLoading } = useTeacherAuth();
  const { toast } = useToast();
  const { withCircuitBreaker } = usePaymentResilience();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancel any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const isStale = useCallback((key: 'transactions' | 'metrics' | 'settings') => {
    const cacheData = state.cache[key];
    return Date.now() - cacheData.timestamp > CACHE_TTL;
  }, []); // FIXED: Remove state.cache dependency to prevent re-renders

  const fetchTransactions = useCallback(async (force = false) => {
    if (!userId || !isTeacher || authLoading) return;

    const operation = async () => {
      // Check cache first - FIXED: Stable cache check
      const now = Date.now();
      const cacheAge = now - state.cache.transactions.timestamp;
      const isCacheValid = cacheAge < CACHE_TTL && state.cache.transactions.data.length > 0;
      
      if (!force && isCacheValid) {
        dispatch({ type: 'SET_TRANSACTIONS', payload: { data: state.cache.transactions.data, fromCache: true } });
        return;
      }

      // Prevent concurrent requests
      if (state.loading.transactions) {
        console.log('[PaymentContext] Transactions already loading, skipping...');
        return;
      }

      // Cancel previous request safely
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      dispatch({ type: 'SET_LOADING', payload: { key: 'transactions', value: true } });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        console.log('[PaymentContext] Fetching transactions for teacher:', userId);
        
        const { data, error } = await supabase
          .from('payment_transactions')
          .select(`
            *,
            service_pricing:service_pricing_id(name, description),
            student:student_id(*)
          `)
          .eq('teacher_id', userId)
          .order('created_at', { ascending: false })
          .limit(50) // OPTIMIZATION: Limit results
          .abortSignal(abortControllerRef.current.signal);

        if (error) {
          console.error('[PaymentContext] Supabase error:', error);
          throw error;
        }

        console.log('[PaymentContext] Transactions loaded:', data?.length || 0);
        dispatch({ type: 'SET_TRANSACTIONS', payload: { data: data || [] } });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('[PaymentContext] Error fetching transactions:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Erro ao carregar transações' });
        }
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { key: 'transactions', value: false } });
      }
    };

    return withCircuitBreaker(operation, 'Buscar Transações');
  }, [userId, isTeacher, authLoading, withCircuitBreaker]); // FIXED: Stable dependencies only

  const fetchMetrics = useCallback(async (force = false) => {
    if (!userId || !isTeacher || authLoading) return;

    // Check cache first - FIXED: Stable cache check
    const now = Date.now();
    const cacheAge = now - state.cache.metrics.timestamp;
    const isCacheValid = cacheAge < CACHE_TTL && state.cache.metrics.data !== null;
    
    if (!force && isCacheValid) {
      dispatch({ type: 'SET_METRICS', payload: { data: state.cache.metrics.data, fromCache: true } });
      return;
    }

    // Prevent concurrent requests
    if (state.loading.metrics) {
      console.log('[PaymentContext] Metrics already loading, skipping...');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: { key: 'metrics', value: true } });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      console.log('[PaymentContext] Fetching metrics for teacher:', userId);
      
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('amount, status, paid_at, currency')
        .eq('teacher_id', userId)
        .limit(1000); // OPTIMIZATION: Reasonable limit

      if (error) {
        console.error('[PaymentContext] Metrics error:', error);
        throw error;
      }

      const metrics: PaymentMetrics = {
        total_revenue: 0,
        paid_transactions: 0,
        pending_transactions: 0,
        failed_transactions: 0,
        transactions_by_month: {},
        revenue_by_month: {}
      };

      if (data && data.length > 0) {
        data.forEach(transaction => {
          const amount = Number(transaction.amount) || 0;
          
          if (transaction.status === 'paid') {
            metrics.total_revenue += amount;
            metrics.paid_transactions++;

            if (transaction.paid_at) {
              const month = new Date(transaction.paid_at).toISOString().substring(0, 7);
              metrics.transactions_by_month[month] = (metrics.transactions_by_month[month] || 0) + 1;
              metrics.revenue_by_month[month] = (metrics.revenue_by_month[month] || 0) + amount;
            }
          } else if (transaction.status === 'pending' || transaction.status === 'processing') {
            metrics.pending_transactions++;
          } else if (transaction.status === 'failed') {
            metrics.failed_transactions++;
          }
        });
      }

      console.log('[PaymentContext] Metrics calculated:', metrics);
      dispatch({ type: 'SET_METRICS', payload: { data: metrics } });
    } catch (error: any) {
      console.error('[PaymentContext] Error fetching metrics:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao carregar métricas' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'metrics', value: false } });
    }
  }, [userId, isTeacher, authLoading]); // FIXED: Stable dependencies only

  const fetchSettings = useCallback(async (force = false) => {
    if (!userId || !isTeacher || authLoading) return;

    const operation = async () => {
      // Check cache first - FIXED: Stable cache check
      const now = Date.now();
      const cacheAge = now - state.cache.settings.timestamp;
      const isCacheValid = cacheAge < CACHE_TTL;
      
      if (!force && isCacheValid && state.cache.settings.data !== null) {
        dispatch({ type: 'SET_SETTINGS', payload: { data: state.cache.settings.data, fromCache: true } });
        return;
      }

      // Prevent concurrent requests
      if (state.loading.settings) {
        console.log('[PaymentContext] Settings already loading, skipping...');
        return;
      }

      dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: true } });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        console.log('[PaymentContext] Fetching payment settings for teacher:', userId);
        
        const { data, error } = await supabase
          .from('teacher_payment_settings')
          .select('*')
          .eq('teacher_id', userId)
          .maybeSingle(); // FIXED: Use maybeSingle() instead of single()
        
        if (error) {
          console.error('[PaymentContext] Settings error:', error);
          throw error;
        }
        
        console.log('[PaymentContext] Settings loaded:', data ? 'Found' : 'Not configured');
        dispatch({ type: 'SET_SETTINGS', payload: { data: data || null } });
      } catch (error: any) {
        console.error('[PaymentContext] Error fetching settings:', error);
        // Don't show error for missing settings - it's normal for new teachers
        if (error.code !== 'PGRST116') {
          dispatch({ type: 'SET_ERROR', payload: 'Erro ao carregar configurações' });
        } else {
          dispatch({ type: 'SET_SETTINGS', payload: { data: null } });
        }
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: false } });
      }
    };

    return withCircuitBreaker(operation, 'Buscar Configurações');
  }, [userId, isTeacher, authLoading, withCircuitBreaker]); // FIXED: Stable dependencies only

  const saveSettings = useCallback(async (newSettings: Partial<TeacherPaymentSettings>) => {
    if (!userId) throw new Error('User not authenticated');

    dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: true } });

    try {
      const settingsData = {
        teacher_id: userId,
        gateway_type: newSettings.gateway_type || 'mercado_pago',
        credentials: {
          api_key: (newSettings as any).api_key,
          is_sandbox: (newSettings as any).is_sandbox,
          webhook_url: (newSettings as any).webhook_url
        },
        webhook_config: {},
        bank_details: {},
        pix_key: '',
        commission_rate: 0,
        is_active: newSettings.is_active !== undefined ? newSettings.is_active : true
      };

      let result;
      if (state.settings?.id) {
        result = await supabase
          .from('teacher_payment_settings')
          .update(settingsData)
          .eq('id', state.settings.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('teacher_payment_settings')
          .insert([settingsData])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      dispatch({ type: 'SET_SETTINGS', payload: { data: result.data } });
      
      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso'
      });

      return result.data;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive'
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: false } });
    }
  }, [userId, state.settings?.id, toast]);

  const deleteSettings = useCallback(async () => {
    if (!state.settings?.id) return;

    dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: true } });

    try {
      const { error } = await supabase
        .from('teacher_payment_settings')
        .delete()
        .eq('id', state.settings.id);

      if (error) throw error;

      dispatch({ type: 'SET_SETTINGS', payload: { data: null } });
      
      toast({
        title: 'Sucesso',
        description: 'Configurações removidas com sucesso'
      });
    } catch (error) {
      console.error('Error deleting settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover as configurações',
        variant: 'destructive'
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: false } });
    }
  }, [state.settings?.id, toast]);

  const createCheckout = useCallback(async (servicePricingId?: string, courseId?: string, paymentMethod: string = 'pix') => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: true } });

    try {
      const body: any = { payment_method: paymentMethod };
      
      if (servicePricingId) {
        body.service_pricing_id = servicePricingId;
      }
      if (courseId) {
        body.course_id = courseId;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Refresh transactions after successful checkout
      await fetchTransactions(true);

      return data;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Erro no Pagamento',
        description: error instanceof Error ? error.message : 'Não foi possível processar o pagamento',
        variant: 'destructive'
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: false } });
    }
  }, [fetchTransactions, toast]);

  const clearCache = useCallback(() => {
    dispatch({ type: 'CLEAR_CACHE' });
  }, []);

  // Auto-fetch data when teacher is authenticated - FIXED: Stable dependencies
  useEffect(() => {
    if (isTeacher && userId && !authLoading) {
      const initializePaymentData = async () => {
        try {
          // Check if data is already loaded and fresh
          const now = Date.now();
          const shouldFetchSettings = !state.settings || (now - state.cache.settings.timestamp > CACHE_TTL);
          const shouldFetchMetrics = !state.metrics || (now - state.cache.metrics.timestamp > CACHE_TTL);
          const shouldFetchTransactions = state.transactions.length === 0 || (now - state.cache.transactions.timestamp > CACHE_TTL);

          if (shouldFetchSettings) {
            fetchSettings(true);
          }
          if (shouldFetchMetrics) {
            fetchMetrics(true);
          }
          if (shouldFetchTransactions) {
            fetchTransactions(true);
          }
        } catch (error) {
          console.error('[PaymentContext] Error initializing payment data:', error);
        }
      };

      // Debounce initialization to prevent rapid calls
      const timeoutId = setTimeout(initializePaymentData, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isTeacher, userId, authLoading]); // FIXED: Only stable dependencies

  const contextValue: PaymentContextType = {
    ...state,
    fetchTransactions,
    fetchMetrics,
    fetchSettings,
    saveSettings,
    deleteSettings,
    createCheckout,
    clearCache,
    isStale
  };

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePaymentContext() {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePaymentContext must be used within a PaymentProvider');
  }
  return context;
}