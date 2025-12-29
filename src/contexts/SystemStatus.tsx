import React, { createContext, useContext } from 'react'
import { useGlobalLoading } from '@/hooks/useGlobalLoading'

interface SystemStatusContextType {
  isHealthy: boolean
  status: 'healthy' | 'degraded' | 'critical'
  authStatus: 'connected' | 'connecting' | 'error'
  dataStatus: 'synced' | 'syncing' | 'error'
  overallPerformance: number
}

const SystemStatusContext = createContext<SystemStatusContextType | null>(null)

export function SystemStatusProvider({ children }: { children: React.ReactNode }) {
  const { loading, isAnyLoading } = useGlobalLoading()

  // Calculate system health based on loading states only
  const authStatus = loading.auth ? 'connecting' : 'connected'
  const dataStatus = (loading.profile || loading.students) ? 'syncing' : 'synced'
  
  const isHealthy = !loading.auth && !loading.profile && !loading.students && !isAnyLoading
  
  const status = isHealthy ? 'healthy' : (loading.auth ? 'degraded' : 'healthy')
  
  // Performance score (0-100)
  let performanceScore = 100
  if (loading.auth) performanceScore -= 30
  if (loading.profile || loading.students) performanceScore -= 20
  if (loading.payments) performanceScore -= 10
  if (loading.sync) performanceScore -= 15

  const value: SystemStatusContextType = {
    isHealthy,
    status,
    authStatus,
    dataStatus,
    overallPerformance: Math.max(0, performanceScore)
  }

  return (
    <SystemStatusContext.Provider value={value}>
      {children}
    </SystemStatusContext.Provider>
  )
}

export function useSystemStatus() {
  const context = useContext(SystemStatusContext)
  if (!context) {
    throw new Error('useSystemStatus must be used within SystemStatusProvider')
  }
  return context
}