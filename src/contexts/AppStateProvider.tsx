import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

// Types
export interface Student {
  id: string;
  user_id: string;
  teacher_id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  // Required properties for backward compatibility
  plan: string;
  mode: string;
  status: string;
  goal: string;
  expiration: string;
  avatar?: string;
}

export interface PlanCatalog {
  id: string;
  teacher_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'quarterly' | 'yearly';
  features: any[];
  is_active: boolean;
  highlighted: boolean;
  icon: string;
  created_at: string;
}

export interface PlanSubscription {
  id: string;
  student_user_id: string;
  teacher_id: string;
  plan_id: string;
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  start_at?: string;
  end_at?: string;
  approved_at?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  metadata?: any;
  updated_at?: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  teacher_id: string;
  student_id: string;
  service_pricing_id?: string;
  amount: number;
  status: string;
  payment_method?: string;
  gateway_type: string;
  gateway_transaction_id?: string;
  created_at: string;
  paid_at?: string;
  metadata?: any;
}

export interface PaymentMetrics {
  total_revenue: number;
  pending_amount: number;
  overdue_amount: number;
  revenue_by_month: Record<string, number>;
}

export interface TeacherPaymentSettings {
  id: string;
  teacher_id: string;
  gateway_type: string;
  is_active: boolean;
  created_at: string;
}

export interface AppState {
  // Auth state
  user: any;
  isTeacher: boolean;
  isAuthenticated: boolean;
  
  // Data state
  students: Student[];
  plans: PlanCatalog[];
  subscriptions: PlanSubscription[];
  transactions: PaymentTransaction[];
  paymentMetrics: PaymentMetrics | null;
  paymentSettings: TeacherPaymentSettings | null;
  
  // Loading states
  loading: {
    auth: boolean;
    data: boolean;
    teacherCheck: boolean;
  };
  
  // Cache state
  cache: {
    students: { data: Student[], timestamp: number } | null;
    plans: { data: PlanCatalog[], timestamp: number } | null;
    subscriptions: { data: PlanSubscription[], timestamp: number } | null;
    transactions: { data: PaymentTransaction[], timestamp: number } | null;
    paymentMetrics: { data: PaymentMetrics, timestamp: number } | null;
    paymentSettings: { data: TeacherPaymentSettings, timestamp: number } | null;
    teacherStatus: { isTeacher: boolean, timestamp: number } | null;
  };
  
  error: string | null;
}

type AppAction =
  | { type: 'SET_AUTH'; payload: { user: any; isAuthenticated: boolean } }
  | { type: 'SET_TEACHER_STATUS'; payload: boolean }
  | { type: 'SET_LOADING'; payload: { type: keyof AppState['loading']; value: boolean } }
  | { type: 'SET_STUDENTS'; payload: Student[] }
  | { type: 'SET_PLANS'; payload: PlanCatalog[] }
  | { type: 'SET_SUBSCRIPTIONS'; payload: PlanSubscription[] }
  | { type: 'SET_TRANSACTIONS'; payload: PaymentTransaction[] }
  | { type: 'SET_PAYMENT_METRICS'; payload: PaymentMetrics }
  | { type: 'SET_PAYMENT_SETTINGS'; payload: TeacherPaymentSettings | null }
  | { type: 'SET_PAYMENT_DATA'; payload: { transactions: PaymentTransaction[]; metrics: PaymentMetrics | null; settings: TeacherPaymentSettings | null } }
  | { type: 'SET_CACHE_TIMESTAMP'; payload: { key: keyof AppState['cache']; timestamp: number } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_CACHE' };

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes (optimized for performance)
const TEACHER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const initialState: AppState = {
  user: null,
  isTeacher: false,
  isAuthenticated: false,
  students: [],
  plans: [],
  subscriptions: [],
  transactions: [],
  paymentMetrics: null,
  paymentSettings: null,
  loading: {
    auth: true,
    data: false,
    teacherCheck: false,
  },
  cache: {
    students: null,
    plans: null,
    subscriptions: null,
    transactions: null,
    paymentMetrics: null,
    paymentSettings: null,
    teacherStatus: null,
  },
  error: null,
};

function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTH':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: action.payload.isAuthenticated,
        loading: { ...state.loading, auth: false },
      };
    
    case 'SET_TEACHER_STATUS':
      return {
        ...state,
        isTeacher: action.payload,
        loading: { ...state.loading, teacherCheck: false },
        cache: {
          ...state.cache,
          teacherStatus: { isTeacher: action.payload, timestamp: Date.now() },
        },
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.type]: action.payload.value },
      };
    
    case 'SET_STUDENTS':
      return {
        ...state,
        students: action.payload,
        cache: {
          ...state.cache,
          students: { data: action.payload, timestamp: Date.now() },
        },
      };
    
    case 'SET_PLANS':
      return {
        ...state,
        plans: action.payload,
        cache: {
          ...state.cache,
          plans: { data: action.payload, timestamp: Date.now() },
        },
      };
    
    case 'SET_SUBSCRIPTIONS':
      return {
        ...state,
        subscriptions: action.payload,
        cache: {
          ...state.cache,
          subscriptions: { data: action.payload, timestamp: Date.now() },
        },
      };
    
    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload,
        cache: {
          ...state.cache,
          transactions: { data: action.payload, timestamp: Date.now() },
        },
      };
    
    case 'SET_PAYMENT_METRICS':
      return {
        ...state,
        paymentMetrics: action.payload,
        cache: {
          ...state.cache,
          paymentMetrics: { data: action.payload, timestamp: Date.now() },
        },
      };
    
    case 'SET_PAYMENT_SETTINGS':
      return {
        ...state,
        paymentSettings: action.payload,
        cache: {
          ...state.cache,
          paymentSettings: action.payload ? { data: action.payload, timestamp: Date.now() } : null,
        },
      };
    
    case 'SET_PAYMENT_DATA':
      return {
        ...state,
        transactions: action.payload.transactions,
        paymentMetrics: action.payload.metrics,
        paymentSettings: action.payload.settings,
        cache: {
          ...state.cache,
          transactions: { data: action.payload.transactions, timestamp: Date.now() },
          paymentMetrics: action.payload.metrics ? { data: action.payload.metrics, timestamp: Date.now() } : null,
          paymentSettings: action.payload.settings ? { data: action.payload.settings, timestamp: Date.now() } : null,
        },
      };
    
    case 'SET_CACHE_TIMESTAMP':
      return {
        ...state,
        cache: {
          ...state.cache,
          [action.payload.key]: {
            ...(state.cache[action.payload.key] || { data: null }),
            timestamp: action.payload.timestamp,
          },
        },
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'CLEAR_CACHE':
      return {
        ...state,
        cache: {
          students: null,
          plans: null,
          subscriptions: null,
          transactions: null,
          paymentMetrics: null,
          paymentSettings: null,
          teacherStatus: null,
        },
      };
    
    default:
      return state;
  }
}

interface AppStateContextType {
  state: AppState;
  actions: {
    checkTeacherStatus: () => Promise<void>;
    fetchAllData: (force?: boolean) => Promise<void>;
    fetchStudents: (force?: boolean) => Promise<void>;
    fetchPlans: (force?: boolean) => Promise<void>;
    fetchSubscriptions: (force?: boolean) => Promise<void>;
    fetchPaymentData: (force?: boolean) => Promise<void>;
    clearCache: () => void;
    isStale: (key: keyof AppState['cache']) => boolean;
  };
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);
  const { user, loading: authLoading } = useSupabaseAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auth effect - fixed to prevent infinite loops
  useEffect(() => {
    if (!authLoading) {
      dispatch({ type: 'SET_AUTH', payload: { user, isAuthenticated: !!user } });
    }
  }, [user, authLoading]);

  const isStale = useCallback((key: keyof AppState['cache']) => {
    const cached = state.cache[key];
    if (!cached) return true;
    
    const ttl = key === 'teacherStatus' ? TEACHER_CACHE_TTL : CACHE_TTL;
    return Date.now() - cached.timestamp > ttl;
  }, [state.cache]);

  const checkTeacherStatus = useCallback(async () => {
    if (!user?.id || state.loading.teacherCheck) return;

    // Use cache if available and not stale
    const cached = state.cache.teacherStatus;
    if (cached && !isStale('teacherStatus')) {
      dispatch({ type: 'SET_TEACHER_STATUS', payload: cached.isTeacher });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: { type: 'teacherCheck', value: true } });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      const isTeacher = data?.user_type === 'teacher';
      dispatch({ type: 'SET_TEACHER_STATUS', payload: isTeacher });
    } catch (error) {
      console.error('Error checking teacher status:', error);
      dispatch({ type: 'SET_TEACHER_STATUS', payload: false });
    }
  }, [user?.id, state.loading.teacherCheck, state.cache.teacherStatus, isStale]);

  const fetchAllData = useCallback(async (force = false) => {
    // Prevent concurrent executions
    if (!user?.id || !state.isAuthenticated || state.loading.data) {
      console.log('🚫 [AppStateProvider] fetchAllData skipped:', { 
        hasUser: !!user?.id, 
        isAuth: state.isAuthenticated, 
        isLoading: state.loading.data 
      });
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    console.log('🚀 [AppStateProvider] Starting fetchAllData, loading=true');
    dispatch({ type: 'SET_LOADING', payload: { type: 'data', value: true } });
    dispatch({ type: 'SET_ERROR', payload: null });

    // Safety timeout to prevent infinite loading (5 seconds max)
    const timeoutId = setTimeout(() => {
      console.log('⚠️ [AppStateProvider] Loading timeout reached, forcing loading=false');
      dispatch({ type: 'SET_LOADING', payload: { type: 'data', value: false } });
    }, 5000);

    try {
      if (state.isTeacher) {
        // Teacher: fetch students, plans, subscriptions, payment data
        const promises = [];

        // Students cache check - simplified
        if (force || isStale('students')) {
          promises.push(
            supabase
              .from('students')
              .select(`
                id, user_id, teacher_id, active_plan, mode, membership_status, goals, membership_expiry, created_at, updated_at,
                profiles(name, email, phone, avatar_url)
              `)
              .eq('teacher_id', user.id)
              .order('created_at', { ascending: false })
          );
        }

        if (force || isStale('plans')) {
          promises.push(
            supabase
              .from('plan_catalog')
              .select('*')
              .eq('teacher_id', user.id)
              .order('created_at', { ascending: false })
          );
        }

        if (force || isStale('subscriptions')) {
          promises.push(
            supabase
              .from('plan_subscriptions')
              .select('*')
              .eq('teacher_id', user.id)
              .order('created_at', { ascending: false })
          );
        }

        if (force || isStale('paymentSettings')) {
          promises.push(
            supabase
              .from('system_payment_config')
              .select('*')
              .eq('gateway_type', 'mercadopago')
              .eq('is_active', true)
              .maybeSingle()
          );
        }

        if (force || isStale('transactions')) {
          promises.push(
            supabase
              .from('payment_transactions')
              .select(`
                *,
                service_pricing:service_pricing(*)
              `)
              .eq('teacher_id', user.id)
              .order('created_at', { ascending: false })
              .limit(100)
          );
        }

        const results = await Promise.all(promises);
        let resultIndex = 0;

        // Process results in order
        if (force || isStale('students')) {
          const studentsResult = results[resultIndex++];
          if (studentsResult.error) throw studentsResult.error;
          
          // Enrich student data with profiles for backward compatibility
          const enrichedStudents: Student[] = (studentsResult.data || []).map((student: any) => ({
            id: student.id,
            user_id: student.user_id,
            teacher_id: student.teacher_id,
            name: student.profiles?.name || student.profiles?.email || 'Sem Nome',
            email: student.profiles?.email || '',
            phone: student.profiles?.phone || '',
            avatar: student.profiles?.avatar_url || null,
            created_at: student.created_at,
            updated_at: student.updated_at || student.created_at,
            // Dados reais da tabela students
            active_plan: student.active_plan,
            mode: student.mode || 'online',
            membership_status: student.membership_status || 'inactive',
            goals: student.goals,
            membership_expiry: student.membership_expiry,
            // Campos calculados para compatibilidade
            plan: student.active_plan || 'Sem plano',
            status: student.membership_status || 'inactive',
            goal: Array.isArray(student.goals) ? student.goals.join(', ') : student.goals || 'Não definido',
            expiration: student.membership_expiry || new Date(Date.now() + 30*24*60*60*1000).toISOString()
          }));
          
          dispatch({ type: 'SET_STUDENTS', payload: enrichedStudents });
        }

        if (force || isStale('plans')) {
          const plansResult = results[resultIndex++];
          if (plansResult.error) throw plansResult.error;
          dispatch({ type: 'SET_PLANS', payload: plansResult.data || [] });
        }

        if (force || isStale('subscriptions')) {
          const subscriptionsResult = results[resultIndex++];
          if (subscriptionsResult.error) throw subscriptionsResult.error;
          
          // Fix and validate subscription data with proper typing
          const rawSubscriptions = subscriptionsResult.data || [];
          const subscriptions: PlanSubscription[] = rawSubscriptions.map((sub: any) => {
            const validStatus: 'pending' | 'active' | 'cancelled' | 'expired' = 
              ['pending', 'active', 'cancelled', 'expired'].includes(sub.status) 
                ? sub.status 
                : 'pending';
            
            if (!sub.start_at || !sub.end_at) {
              const plan = state.plans.find(p => p.id === sub.plan_id);
              const createdDate = new Date(sub.created_at);
              
              let endDate = new Date(createdDate);
              if (plan?.interval === 'monthly') {
                endDate.setMonth(endDate.getMonth() + 1);
              } else if (plan?.interval === 'quarterly') {
                endDate.setMonth(endDate.getMonth() + 3);
              } else if (plan?.interval === 'yearly') {
                endDate.setFullYear(endDate.getFullYear() + 1);
              } else {
                endDate.setMonth(endDate.getMonth() + 1);
              }

              return {
                id: sub.id,
                student_user_id: sub.student_user_id,
                teacher_id: sub.teacher_id,
                plan_id: sub.plan_id,
                status: validStatus,
                start_at: sub.start_at || sub.approved_at || sub.created_at,
                end_at: sub.end_at || endDate.toISOString(),
                approved_at: sub.approved_at,
                cancelled_at: sub.cancelled_at,
                cancelled_reason: sub.cancelled_reason,
                metadata: sub.metadata,
                updated_at: sub.updated_at,
                created_at: sub.created_at
              };
            }
            
            return {
              id: sub.id,
              student_user_id: sub.student_user_id,
              teacher_id: sub.teacher_id,
              plan_id: sub.plan_id,
              status: validStatus,
              start_at: sub.start_at,
              end_at: sub.end_at,
              approved_at: sub.approved_at,
              cancelled_at: sub.cancelled_at,
              cancelled_reason: sub.cancelled_reason,
              metadata: sub.metadata,
              updated_at: sub.updated_at,
              created_at: sub.created_at
            };
          });
          
          dispatch({ type: 'SET_SUBSCRIPTIONS', payload: subscriptions });
        }

        if (force || isStale('paymentSettings')) {
          const settingsResult = results[resultIndex++];
          if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
            throw settingsResult.error;
          }
          dispatch({ type: 'SET_PAYMENT_SETTINGS', payload: settingsResult.data });
        }

        if (force || isStale('transactions')) {
          const transactionsResult = results[resultIndex++];
          if (transactionsResult.error) throw transactionsResult.error;
          
          // CORREÇÃO: Buscar nomes dos estudantes separadamente para evitar problema de JOIN
          const paymentData = transactionsResult.data || []
          const studentIds = [...new Set(paymentData.map((t: any) => t.student_id).filter(Boolean))] as string[]
          const studentsNamesMap = new Map()
          
          if (studentIds.length > 0) {
            try {
              const { data: studentsProfiles } = await supabase
                .from('profiles')
                .select('id, name, email')
                .in('id', studentIds)
              
              studentsProfiles?.forEach(profile => {
                studentsNamesMap.set(profile.id, { name: profile.name, email: profile.email })
              })
            } catch (profileError) {
              console.warn('Warning: Could not fetch student profiles:', profileError)
            }
          }

          const transactions: PaymentTransaction[] = paymentData.map((transaction: any) => {
            const studentInfo = studentsNamesMap.get(transaction.student_id) || { name: 'Sem nome', email: '' }
            
            return {
              id: transaction.id,
              teacher_id: transaction.teacher_id,
              student_id: transaction.student_id,
              service_pricing_id: transaction.service_pricing_id,
              amount: transaction.amount,
              status: transaction.status || 'pending',
              payment_method: transaction.payment_method,
              gateway_type: transaction.gateway_type,
              gateway_transaction_id: transaction.gateway_transaction_id,
              created_at: transaction.created_at,
              paid_at: transaction.paid_at,
              metadata: transaction.metadata,
              // Add student info from separate query
              student_name: studentInfo.name,
              student_email: studentInfo.email
            }
          });
          
          dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
        }

        // Calculate payment metrics
        const totalRevenue = state.subscriptions.reduce((sum, sub) => {
          const plan = state.plans.find(p => p.id === sub.plan_id);
          return sum + (plan?.price || 0);
        }, 0);

        const metrics: PaymentMetrics = {
          total_revenue: totalRevenue,
          pending_amount: 0,
          overdue_amount: 0,
          revenue_by_month: {}
        };

        dispatch({ type: 'SET_PAYMENT_METRICS', payload: metrics });

      } else {
        // Student: fetch their plans and subscriptions
        const { data: studentRel, error: relError } = await supabase
          .from('students')
          .select('teacher_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (relError) throw relError;

        const teacherId = studentRel?.teacher_id;
        if (!teacherId) return;

        const [plansResult, subscriptionsResult] = await Promise.all([
          supabase
            .from('plan_catalog')
            .select('*')
            .eq('teacher_id', teacherId)
            .eq('is_active', true)
            .order('price', { ascending: true }),
          supabase
            .from('plan_subscriptions')
            .select('*')
            .eq('student_user_id', user.id)
            .order('created_at', { ascending: false })
        ]);

        if (plansResult.error) throw plansResult.error;
        if (subscriptionsResult.error) throw subscriptionsResult.error;

        const plansData = (plansResult.data || []).map((plan: any) => ({
          ...plan,
          features: Array.isArray(plan.features) ? plan.features : []
        }));
        const subscriptionsData: PlanSubscription[] = (subscriptionsResult.data || []).map((sub: any) => ({
          id: sub.id,
          student_user_id: sub.student_user_id,
          teacher_id: sub.teacher_id,
          plan_id: sub.plan_id,
          status: ['pending', 'active', 'cancelled', 'expired'].includes(sub.status) ? sub.status : 'pending',
          start_at: sub.start_at,
          end_at: sub.end_at,
          approved_at: sub.approved_at,
          cancelled_at: sub.cancelled_at,
          cancelled_reason: sub.cancelled_reason,
          metadata: sub.metadata,
          updated_at: sub.updated_at,
          created_at: sub.created_at
        }));
        
        dispatch({ type: 'SET_PLANS', payload: plansData });
        dispatch({ type: 'SET_SUBSCRIPTIONS', payload: subscriptionsData });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching app data:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message || 'Erro ao carregar dados' });
      }
    } finally {
      clearTimeout(timeoutId);
      console.log('✅ [AppStateProvider] fetchAllData completed, loading=false');
      dispatch({ type: 'SET_LOADING', payload: { type: 'data', value: false } });
    }
  }, [user?.id, state.isAuthenticated, state.isTeacher, isStale]);

  // Individual fetch functions for specific data types
  const fetchStudents = useCallback(async (force = false) => {
    if (!force && !isStale('students')) return;
    // Use cached data if available
    if (state.cache.students && !force) {
      dispatch({ type: 'SET_STUDENTS', payload: state.cache.students.data });
      return;
    }
    // Will be implemented as part of fetchAllData
    await fetchAllData(force);
  }, [fetchAllData, isStale, state.cache.students]);

  const fetchPlans = useCallback(async (force = false) => {
    if (!force && !isStale('plans')) return;
    await fetchAllData(force);
  }, [fetchAllData, isStale]);

  const fetchSubscriptions = useCallback(async (force = false) => {
    if (!force && !isStale('subscriptions')) return;
    await fetchAllData(force);
  }, [fetchAllData, isStale]);

  // Debounced fetch to prevent infinite loading
  const fetchPaymentDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const fetchPaymentData = useCallback(async (force = false) => {
    if (!user?.id || !state.isAuthenticated || !state.isTeacher) {
      console.log('⚠️ fetchPaymentData: User not authenticated or not teacher');
      dispatch({ type: 'SET_LOADING', payload: { type: 'data', value: false } });
      return;
    }

    // Clear existing timeout to prevent multiple calls
    if (fetchPaymentDataTimeoutRef.current) {
      clearTimeout(fetchPaymentDataTimeoutRef.current);
      fetchPaymentDataTimeoutRef.current = null;
    }

    // Check if already loading (prevent multiple simultaneous calls)
    if (state.loading.data && !force) {
      console.log('⏳ fetchPaymentData: Already loading, skipping...');
      return;
    }

    // Check cache first - only fetch if stale or forced
    if (!force && !isStale('transactions') && !isStale('paymentSettings')) {
      console.log('💾 fetchPaymentData: Using fresh cached data');
      dispatch({ type: 'SET_LOADING', payload: { type: 'data', value: false } });
      return;
    }

    console.log('🔄 fetchPaymentData: Starting data fetch...', { force, isStale: isStale('transactions') });
    dispatch({ type: 'SET_LOADING', payload: { type: 'data', value: true } });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Simplified queries - get core data only
      const [transactionsResult, settingsResult] = await Promise.all([
        supabase
          .from('payment_transactions')
          .select('*')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),

        supabase
          .from('teacher_payment_settings')
          .select('*')
          .eq('teacher_id', user.id)
          .maybeSingle()
      ]);

      if (transactionsResult.error) {
        throw new Error(`Transactions error: ${transactionsResult.error.message}`);
      }

      // Process transactions with safe fallbacks
      const transactions: PaymentTransaction[] = (transactionsResult.data || []).map((transaction: any) => ({
        id: transaction.id,
        teacher_id: transaction.teacher_id,
        student_id: transaction.student_id,
        service_pricing_id: transaction.service_pricing_id,
        amount: transaction.amount || 0,
        status: transaction.status || 'pending',
        payment_method: transaction.payment_method || '',
        gateway_type: transaction.gateway_type || 'manual',
        gateway_transaction_id: transaction.gateway_transaction_id || '',
        created_at: transaction.created_at,
        paid_at: transaction.paid_at,
        metadata: transaction.metadata || {}
      }));

      // Compute real metrics from transaction data
      const paidTransactions = transactions.filter(t => t.status === 'paid');
      const pendingTransactions = transactions.filter(t => t.status === 'pending');
      
      const totalRevenue = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
      const pendingAmount = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const monthlyRevenue = paidTransactions
        .filter(t => new Date(t.created_at) >= thisMonth)
        .reduce((sum, t) => sum + t.amount, 0);

      const computedMetrics: PaymentMetrics = {
        total_revenue: totalRevenue,
        pending_amount: pendingAmount,
        overdue_amount: 0, // Could be computed based on due dates
        revenue_by_month: {
          [thisMonth.toISOString().substring(0, 7)]: monthlyRevenue
        }
      };

      // Update all state atomically
      dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
      dispatch({ type: 'SET_PAYMENT_METRICS', payload: computedMetrics });
      
      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        console.warn('Settings error (non-critical):', settingsResult.error.message);
      } else {
        dispatch({ type: 'SET_PAYMENT_SETTINGS', payload: settingsResult.data });
      }

      console.log(`✅ fetchPaymentData: Success - ${transactions.length} transactions, R$${totalRevenue.toFixed(2)} total revenue`);

    } catch (error: any) {
      console.error('❌ fetchPaymentData Error:', error);
      dispatch({ type: 'SET_ERROR', payload: `Erro ao carregar pagamentos: ${error.message}` });
    } finally {
      // ALWAYS set loading to false
      dispatch({ type: 'SET_LOADING', payload: { type: 'data', value: false } });
    }
  }, [user?.id, state.isAuthenticated, state.isTeacher, state.loading.data, isStale]);

  const clearCache = useCallback(() => {
    dispatch({ type: 'CLEAR_CACHE' });
  }, []);

  // Auto-fetch when auth is ready - fixed to prevent infinite loops
  useEffect(() => {
    if (user?.id && !authLoading && !state.loading.teacherCheck) {
      checkTeacherStatus();
    }
  }, [user?.id, authLoading, state.loading.teacherCheck]);

  // Auto-fetch data when teacher status is determined - Fixed infinite loop
  const hasTriggeredFetch = useRef(false);
  
  useEffect(() => {
    if (user?.id && !state.loading.teacherCheck && !state.loading.data && state.cache.teacherStatus && !state.loading.auth && !hasTriggeredFetch.current) {
      console.log('🎯 [AppStateProvider] Auto-fetching data after teacher status determined');
      hasTriggeredFetch.current = true;
      fetchAllData();
    }
  }, [user?.id, state.loading.teacherCheck, state.loading.data, state.cache.teacherStatus?.timestamp, state.loading.auth]);
  
  // Reset trigger when user changes
  useEffect(() => {
    hasTriggeredFetch.current = false;
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const contextValue: AppStateContextType = {
    state,
    actions: {
      checkTeacherStatus,
      fetchAllData,
      fetchStudents,
      fetchPlans,
      fetchSubscriptions,
      fetchPaymentData,
      clearCache,
      isStale,
    },
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}