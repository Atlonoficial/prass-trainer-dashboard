import { useCallback, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useRateLimit() {
  const [isLimited, setIsLimited] = useState(false)

  const checkRateLimit = useCallback(async (
    operationType: string,
    maxAttempts: number = 5,
    timeWindowHours: number = 1
  ): Promise<boolean> => {
    try {
      const { data } = await supabase.rpc('check_rate_limit', {
        operation_type: operationType,
        max_attempts: maxAttempts,
        time_window: `${timeWindowHours} hours`
      })
      
      const allowed = data || false
      setIsLimited(!allowed)
      return allowed
    } catch (error) {
      console.warn('Rate limit check failed:', error)
      // On error, allow the operation
      return true
    }
  }, [])

  return {
    checkRateLimit,
    isLimited
  }
}