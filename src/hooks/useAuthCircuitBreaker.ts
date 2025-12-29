import { useState, useCallback, useRef } from 'react'

interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  monitorWindow: number
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open'
  failures: number
  lastFailureTime: number
  nextAttempt: number
}

export function useAuthCircuitBreaker(config: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  monitorWindow: 60000  // 1 minute
}) {
  const [state, setState] = useState<CircuitBreakerState>({
    state: 'closed',
    failures: 0,
    lastFailureTime: 0,
    nextAttempt: 0
  })

  const requestCount = useRef(0)
  const windowStart = useRef(Date.now())

  const isCircuitOpen = useCallback(() => {
    const now = Date.now()
    
    // Reset monitoring window if needed
    if (now - windowStart.current > config.monitorWindow) {
      windowStart.current = now
      requestCount.current = 0
    }

    // Check if circuit should move from open to half-open
    if (state.state === 'open' && now >= state.nextAttempt) {
      setState(prev => ({ ...prev, state: 'half-open' }))
      return false
    }

    return state.state === 'open'
  }, [state, config])

  const executeWithCircuitBreaker = useCallback(async <T>(
    operation: () => Promise<T>,
    operationType: string = 'auth'
  ): Promise<T | null> => {
    const now = Date.now()
    requestCount.current++

    // Check if too many requests in window
    if (requestCount.current > 50) { // Max 50 requests per minute
      console.warn(`[CircuitBreaker] Too many ${operationType} requests, throttling`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    if (isCircuitOpen()) {
      console.warn(`[CircuitBreaker] Circuit is open for ${operationType}, blocking request`)
      return null
    }

    try {
      const result = await operation()
      
      // Success - reset failures if in half-open state
      if (state.state === 'half-open') {
        setState({
          state: 'closed',
          failures: 0,
          lastFailureTime: 0,
          nextAttempt: 0
        })
        console.log(`[CircuitBreaker] Circuit closed for ${operationType}`)
      }
      
      return result
    } catch (error) {
      console.error(`[CircuitBreaker] ${operationType} operation failed:`, error)
      
      const newFailures = state.failures + 1
      const shouldOpen = newFailures >= config.failureThreshold
      
      setState({
        state: shouldOpen ? 'open' : 'closed',
        failures: newFailures,
        lastFailureTime: now,
        nextAttempt: shouldOpen ? now + config.resetTimeout : 0
      })
      
      if (shouldOpen) {
        console.warn(`[CircuitBreaker] Circuit opened for ${operationType} after ${newFailures} failures`)
      }
      
      throw error
    }
  }, [state, config, isCircuitOpen])

  const getCircuitStatus = useCallback(() => {
    return {
      state: state.state,
      failures: state.failures,
      isOpen: state.state === 'open',
      requestsInWindow: requestCount.current,
      timeToReset: state.state === 'open' ? Math.max(0, state.nextAttempt - Date.now()) : 0
    }
  }, [state])

  const forceReset = useCallback(() => {
    setState({
      state: 'closed',
      failures: 0,
      lastFailureTime: 0,
      nextAttempt: 0
    })
    requestCount.current = 0
    windowStart.current = Date.now()
    console.log('[CircuitBreaker] Circuit forcibly reset')
  }, [])

  return {
    executeWithCircuitBreaker,
    getCircuitStatus,
    forceReset,
    isCircuitOpen: state.state === 'open'
  }
}