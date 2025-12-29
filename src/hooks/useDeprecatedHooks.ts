/**
 * DEPRECATED HOOKS - USE UNIFIED SYSTEM INSTEAD
 * 
 * These hooks have been replaced by the unified authentication and state system.
 * Please migrate to the new system:
 * 
 * OLD: useAuth(), useStableAuth(), useSupabaseAuth(), useMinimalAuth()
 * NEW: useUnifiedApp() or useUnifiedAuth()
 * 
 * OLD: useAppState() from AppStateProvider
 * NEW: useUnifiedApp()
 * 
 * OLD: useOptimizedProfile()
 * NEW: useOptimizedProfileCompat() (temporary) or useUnifiedApp().userProfile
 */

import { useUnifiedApp } from '@/contexts/UnifiedAppProvider'

// Compatibility exports for gradual migration
export const useAuth = () => {
  console.warn('⚠️ useAuth is deprecated. Use useUnifiedApp() instead.')
  return useUnifiedApp()
}

export const useStableAuth = () => {
  console.warn('⚠️ useStableAuth is deprecated. Use useUnifiedApp() instead.')
  return useUnifiedApp()
}

export const useSupabaseAuth = () => {
  console.warn('⚠️ useSupabaseAuth is deprecated. Use useUnifiedApp() instead.')
  return useUnifiedApp()
}

export const useMinimalAuth = () => {
  console.warn('⚠️ useMinimalAuth is deprecated. Use useUnifiedApp() instead.')
  return useUnifiedApp()
}