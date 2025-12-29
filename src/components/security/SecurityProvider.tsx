import { createContext, useContext, ReactNode } from 'react'
import { useSecurityAudit } from '@/hooks/useSecurityAudit'
import { useRateLimit } from '@/hooks/useRateLimit'

interface SecurityContextType {
  logSensitiveAccess: (tableName: string, recordId: string, accessType: 'read' | 'write' | 'delete') => Promise<void>
  validateInput: (inputText: string, maxLength?: number, allowHtml?: boolean) => Promise<boolean>
  checkRateLimit: (operationType: string, maxAttempts?: number, timeWindowHours?: number) => Promise<boolean>
  isLimited: boolean
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

interface SecurityProviderProps {
  children: ReactNode
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const { logSensitiveAccess, validateInput } = useSecurityAudit()
  const { checkRateLimit, isLimited } = useRateLimit()

  const value: SecurityContextType = {
    logSensitiveAccess,
    validateInput,
    checkRateLimit,
    isLimited
  }

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  )
}

export function useSecurity() {
  const context = useContext(SecurityContext)
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider')
  }
  return context
}