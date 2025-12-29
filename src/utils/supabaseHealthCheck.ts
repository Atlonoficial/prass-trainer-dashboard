interface SupabaseHealthState {
  isHealthy: boolean
  failureCount: number
  lastFailure: number | null
  circuitOpen: boolean
  lastCheck: number | null
}

const healthState: SupabaseHealthState = {
  isHealthy: true,
  failureCount: 0,
  lastFailure: null,
  circuitOpen: false,
  lastCheck: null
}

const FAILURE_THRESHOLD = 3
const CIRCUIT_RESET_TIME = 30000 // 30 seconds
const CHECK_COOLDOWN = 5000 // 5 seconds between checks

export function recordSupabaseFailure(context: string = 'unknown') {
  healthState.failureCount++
  healthState.lastFailure = Date.now()
  healthState.lastCheck = Date.now()
  
  console.warn(`[Circuit Breaker] Failure recorded in ${context}. Count: ${healthState.failureCount}/${FAILURE_THRESHOLD}`)
  
  if (healthState.failureCount >= FAILURE_THRESHOLD) {
    healthState.circuitOpen = true
    healthState.isHealthy = false
    console.error(`[Circuit Breaker] Circuit OPENED - Supabase unhealthy after ${FAILURE_THRESHOLD} failures`)
    
    // Auto-reset after timeout
    setTimeout(() => {
      console.log('[Circuit Breaker] Attempting to reset circuit...')
      healthState.circuitOpen = false
      healthState.failureCount = 0
      console.log('[Circuit Breaker] Circuit moved to HALF-OPEN state')
    }, CIRCUIT_RESET_TIME)
  }
}

export function recordSupabaseSuccess(context: string = 'unknown') {
  const wasUnhealthy = !healthState.isHealthy
  
  healthState.failureCount = 0
  healthState.isHealthy = true
  healthState.circuitOpen = false
  healthState.lastCheck = Date.now()
  
  if (wasUnhealthy) {
    console.log(`[Circuit Breaker] Circuit CLOSED - Supabase recovered in ${context}`)
  }
}

export function isSupabaseHealthy(): boolean {
  const now = Date.now()
  
  // If circuit is open, check if reset time has passed
  if (healthState.circuitOpen) {
    if (healthState.lastFailure && now - healthState.lastFailure > CIRCUIT_RESET_TIME) {
      healthState.circuitOpen = false
      healthState.failureCount = 0
      console.log('[Circuit Breaker] Circuit auto-reset to HALF-OPEN')
    }
  }
  
  return !healthState.circuitOpen
}

export function getCircuitBreakerStatus() {
  return {
    isHealthy: healthState.isHealthy,
    isCircuitOpen: healthState.circuitOpen,
    failureCount: healthState.failureCount,
    lastFailure: healthState.lastFailure,
    lastCheck: healthState.lastCheck,
    state: healthState.circuitOpen ? 'OPEN' : (healthState.failureCount > 0 ? 'HALF-OPEN' : 'CLOSED')
  }
}

export function forceResetCircuit() {
  console.log('[Circuit Breaker] Force reset requested')
  healthState.isHealthy = true
  healthState.failureCount = 0
  healthState.lastFailure = null
  healthState.circuitOpen = false
  healthState.lastCheck = Date.now()
}
