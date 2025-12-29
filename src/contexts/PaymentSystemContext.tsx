import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentTransaction {
  id: string;
  teacher_id: string;
  student_id: string;
  amount: number;
  status: string;
  payment_method?: string;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  } | null;
}

interface PaymentMetrics {
  total_revenue: number;
  total_transactions: number;
  paid_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  monthly_revenue: Array<{ month: string; revenue: number; transactions: number }>;
}

interface TeacherPaymentSettings {
  id: string;
  teacher_id: string;
  pix_key?: string;
  gateway_type?: string;
  is_active?: boolean;
}

interface PaymentSystemState {
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
    transactions: { data: PaymentTransaction[]; timestamp: number };
    metrics: { data: PaymentMetrics | null; timestamp: number };
    settings: { data: TeacherPaymentSettings | null; timestamp: number };
  };
}

type PaymentSystemAction =
  | { type: 'SET_LOADING'; payload: { key: keyof PaymentSystemState['loading']; value: boolean } }
  | { type: 'SET_TRANSACTIONS'; payload: PaymentTransaction[] }
  | { type: 'SET_METRICS'; payload: PaymentMetrics }
  | { type: 'SET_SETTINGS'; payload: TeacherPaymentSettings | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_CACHE' };

const initialState: PaymentSystemState = {
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

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function paymentSystemReducer(state: PaymentSystemState, action: PaymentSystemAction): PaymentSystemState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      };
    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload,
        cache: {
          ...state.cache,
          transactions: { data: action.payload, timestamp: Date.now() }
        },
        error: null
      };
    case 'SET_METRICS':
      return {
        ...state,
        metrics: action.payload,
        cache: {
          ...state.cache,
          metrics: { data: action.payload, timestamp: Date.now() }
        },
        error: null
      };
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.payload,
        cache: {
          ...state.cache,
          settings: { data: action.payload, timestamp: Date.now() }
        },
        error: null
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
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

interface PaymentSystemContextType extends PaymentSystemState {
  fetchTransactions: (force?: boolean) => Promise<void>;
  fetchMetrics: (force?: boolean) => Promise<void>;
  fetchSettings: (force?: boolean) => Promise<void>;
  saveSettings: (settings: Partial<TeacherPaymentSettings>) => Promise<void>;
  deleteSettings: () => Promise<void>;
  createCheckout: (servicePricingId?: string, courseId?: string, paymentMethod?: string) => Promise<any>;
  clearCache: () => void;
  isStale: (key: keyof PaymentSystemState['cache']) => boolean;
}

const PaymentSystemContext = createContext<PaymentSystemContextType | undefined>(undefined);

export function usePaymentSystem() {
  const context = useContext(PaymentSystemContext);
  if (!context) {
    throw new Error('usePaymentSystem must be used within PaymentSystemProvider');
  }
  return context;
}

interface PaymentSystemProviderProps {
  children: React.ReactNode;
  teacherId?: string;
}

export function PaymentSystemProvider({ children, teacherId }: PaymentSystemProviderProps) {
  const [state, dispatch] = useReducer(paymentSystemReducer, initialState);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController>();

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const isStale = useCallback((key: keyof PaymentSystemState['cache']) => {
    const cached = state.cache[key];
    return Date.now() - cached.timestamp > CACHE_TTL;
  }, [state.cache]);

  const fetchTransactions = useCallback(async (force = false) => {
    if (!teacherId) return;
    if (!force && !isStale('transactions') && state.transactions.length > 0) return;

    dispatch({ type: 'SET_LOADING', payload: { key: 'transactions', value: true } });
    
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          profiles:student_id (
            name, email
          )
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      dispatch({ type: 'SET_TRANSACTIONS', payload: (data as any[]) || [] });
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching transactions:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
        toast({
          title: "Erro ao carregar transações",
          description: "Tente novamente em alguns segundos",
          variant: "destructive"
        });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'transactions', value: false } });
    }
  }, [teacherId, isStale, state.transactions.length, toast]);

  const fetchMetrics = useCallback(async (force = false) => {
    if (!teacherId) return;
    if (!force && !isStale('metrics') && state.metrics) return;

    dispatch({ type: 'SET_LOADING', payload: { key: 'metrics', value: true } });
    
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Simulando métricas já que não temos a função RPC
      const mockMetrics: PaymentMetrics = {
        total_revenue: 0,
        total_transactions: state.transactions.length,
        paid_transactions: state.transactions.filter(t => t.status === 'paid').length,
        pending_transactions: state.transactions.filter(t => t.status === 'pending').length,
        failed_transactions: state.transactions.filter(t => t.status === 'failed').length,
        monthly_revenue: []
      };
      
      dispatch({ type: 'SET_METRICS', payload: mockMetrics });
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching metrics:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'metrics', value: false } });
    }
  }, [teacherId, isStale, state.metrics, state.transactions]);

  const fetchSettings = useCallback(async (force = false) => {
    if (!teacherId) return;
    if (!force && !isStale('settings')) return;

    dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: true } });
    
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const { data, error } = await supabase
        .from('teacher_payment_settings')
        .select('*')
        .eq('teacher_id', teacherId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      dispatch({ type: 'SET_SETTINGS', payload: (data as any) || null });
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching settings:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: false } });
    }
  }, [teacherId, isStale]);

  const saveSettings = useCallback(async (settings: Partial<TeacherPaymentSettings>) => {
    if (!teacherId) return;

    dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: true } });
    
    try {
      const { data, error } = await supabase
        .from('teacher_payment_settings')
        .upsert({
          teacher_id: teacherId,
          gateway_type: 'pix',
          ...settings
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      dispatch({ type: 'SET_SETTINGS', payload: (data as any) });
      toast({
        title: "Configurações salvas",
        description: "Suas configurações de pagamento foram atualizadas",
      });
      
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: false } });
    }
  }, [teacherId, toast]);

  const deleteSettings = useCallback(async () => {
    if (!teacherId || !state.settings) return;

    dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: true } });
    
    try {
      const { error } = await supabase
        .from('teacher_payment_settings')
        .delete()
        .eq('teacher_id', teacherId);

      if (error) throw error;
      
      dispatch({ type: 'SET_SETTINGS', payload: null });
      toast({
        title: "Configurações removidas",
        description: "Suas configurações de pagamento foram removidas",
      });
      
    } catch (error: any) {
      console.error('Error deleting settings:', error);
      toast({
        title: "Erro ao remover configurações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: false } });
    }
  }, [teacherId, state.settings, toast]);

  const createCheckout = useCallback(async (
    servicePricingId?: string,
    courseId?: string,
    paymentMethod = 'pix'
  ) => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: true } });
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          servicePricingId,
          courseId,
          paymentMethod
        }
      });

      if (error) throw error;
      return data;
      
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erro ao criar checkout",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'actions', value: false } });
    }
  }, [toast]);

  const clearCache = useCallback(() => {
    dispatch({ type: 'CLEAR_CACHE' });
  }, []);

  const contextValue: PaymentSystemContextType = {
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
    <PaymentSystemContext.Provider value={contextValue}>
      {children}
    </PaymentSystemContext.Provider>
  );
}