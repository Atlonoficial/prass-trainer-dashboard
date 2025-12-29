import { useUnifiedApp } from '@/contexts/UnifiedAppProvider'

/**
 * Compatibility hook to replace the old AppStateProvider
 * This ensures existing components continue to work while using the new unified system
 */
export function useAppState() {
  const unifiedApp = useUnifiedApp()
  
  // Proteção defensiva contra valores undefined
  const {
    user = null,
    userId = null,
    isAuthenticated = false,
    userRole = null,
    students = [],
    userProfile = null,
    transactions = [],
    plans = [],
    subscriptions = [],
    paymentMetrics = null,
    studentsWithPayments = [],
    loading = { auth: false, profile: false, students: false, payments: false, sync: false },
    refetchStudents = async () => {},
    refetchProfile = async () => {},
    refetchPaymentData = async () => {},
    signOut = async () => {}
  } = unifiedApp || {}

  // Real state structure using unified data
  const state = {
    user,
    userProfile,
    students: students || [],
    transactions: transactions || [],
    subscriptions: subscriptions || [],
    plans: plans || [],
    paymentMetrics: paymentMetrics || null,
    paymentSettings: null,
    studentsWithPayments: studentsWithPayments || [],
    loading: {
      auth: loading.auth,
      data: loading.profile || loading.students,
      payments: loading.payments,
      sync: loading.sync
    },
    error: null,
    cache: {
      students: { data: students, timestamp: Date.now() },
      transactions: { data: transactions, timestamp: Date.now() },
      subscriptions: { data: subscriptions, timestamp: Date.now() },
      plans: { data: plans, timestamp: Date.now() },
      paymentMetrics: { data: paymentMetrics, timestamp: Date.now() },
      paymentSettings: null,
      studentsWithPayments: { data: studentsWithPayments, timestamp: Date.now() }
    }
  }

  // Real actions using unified system
  const actions = {
    fetchPaymentData: async (force = false) => {
      console.log('fetchPaymentData called - refreshing payment data', force)
      await refetchPaymentData()
    },
    isStale: (key: string) => {
      const cacheTime = Date.now() - (2 * 60 * 1000) // 2 minutes
      const cache = state.cache[key as keyof typeof state.cache]
      return !cache || cache.timestamp < cacheTime
    },
    clearCache: () => {
      console.log('clearCache called - invalidating all payment cache')
      // Cache clearing is handled by unified provider
    }
  }

  // Backward compatibility mapping
  return {
    // Auth state
    user,
    session: null, // Legacy field, not needed
    loading: loading.auth,
    isAuthenticated,
    userId,
    userType: userRole,
    
    // User data
    userProfile,
    profile: userProfile, // Alias for compatibility
    
    // Students data (for teachers)
    students,
    studentsList: students, // Alias for compatibility
    studentsWithPayments, // Enhanced student data with payment status
    
    // Loading states
    studentsLoading: loading.profile || loading.students,
    profileLoading: loading.profile,
    
    // Actions
    refetchStudents,
    refetchProfile,
    signOut,
    
    // Legacy methods for compatibility
    refreshAuth: async () => {
      await refetchProfile()
    },
    
    updateUserProfile: refetchProfile,
    fetchStudents: refetchStudents,

    // NEW: Add state and actions for payment hook compatibility
    state,
    actions
  }
}