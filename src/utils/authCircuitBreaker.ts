/**
 * Circuit Breaker para prevenir tentativas infinitas de autenticação
 * quando o servidor Supabase está inacessível
 */

class AuthCircuitBreaker {
  private failureCount = 0
  private lastFailure = 0
  private readonly THRESHOLD = 3 // 3 falhas consecutivas abrem o circuit
  private readonly COOLDOWN = 60000 // 1 minuto de cooldown

  isOpen(): boolean {
    if (this.failureCount >= this.THRESHOLD) {
      const timeSinceLastFailure = Date.now() - this.lastFailure
      if (timeSinceLastFailure < this.COOLDOWN) {
        console.warn(
          `[CircuitBreaker] ⚠️ Circuit aberto - aguarde ${Math.ceil((this.COOLDOWN - timeSinceLastFailure) / 1000)}s`
        )
        return true
      } else {
        // Cooldown acabou, resetar
        console.log('[CircuitBreaker] ✅ Cooldown completo, resetando circuit breaker')
        this.reset()
      }
    }
    return false
  }

  recordFailure(errorType: string) {
    this.failureCount++
    this.lastFailure = Date.now()
    console.warn(`[CircuitBreaker] ❌ Falha registrada (${this.failureCount}/${this.THRESHOLD}): ${errorType}`)
  }

  recordSuccess() {
    if (this.failureCount > 0) {
      console.log('[CircuitBreaker] ✅ Sucesso - resetando contadores')
    }
    this.failureCount = 0
  }

  reset() {
    this.failureCount = 0
    this.lastFailure = 0
    console.log('[CircuitBreaker] 🔄 Circuit breaker resetado')
  }

  getStatus() {
    return {
      isOpen: this.isOpen(),
      failureCount: this.failureCount,
      timeToReset: this.isOpen() ? Math.ceil((this.COOLDOWN - (Date.now() - this.lastFailure)) / 1000) : 0
    }
  }
}

// Singleton global
export const authCircuitBreaker = new AuthCircuitBreaker()
