/**
 * 🚨 GLOBAL CIRCUIT BREAKER
 * 
 * Protege sistema contra sobrecarga em cascata
 * Abre circuito após 5 falhas consecutivas
 * Fecha automaticamente após 2 minutos
 */

interface CircuitState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailure: number | null;
  lastSuccess: number | null;
}

class GlobalCircuitBreaker {
  private state: CircuitState = {
    status: 'CLOSED',
    failures: 0,
    lastFailure: null,
    lastSuccess: null
  };

  private readonly FAILURE_THRESHOLD = 5;
  private readonly RECOVERY_TIME = 2 * 60 * 1000; // 2 minutos

  recordFailure(component: string) {
    this.state.failures++;
    this.state.lastFailure = Date.now();
    
    console.warn(`🔴 [CircuitBreaker] Falha em ${component} (${this.state.failures}/${this.FAILURE_THRESHOLD})`);

    if (this.state.failures >= this.FAILURE_THRESHOLD) {
      this.state.status = 'OPEN';
      console.error(`❌ [CircuitBreaker] CIRCUITO ABERTO - Sistema em proteção`);
    }
  }

  recordSuccess(component: string) {
    this.state.failures = Math.max(0, this.state.failures - 1);
    this.state.lastSuccess = Date.now();
    
    if (this.state.status === 'HALF_OPEN' && this.state.failures === 0) {
      this.state.status = 'CLOSED';
      console.log(`✅ [CircuitBreaker] CIRCUITO FECHADO - Sistema recuperado`);
    }
  }

  isOpen(): boolean {
    if (this.state.status === 'OPEN') {
      const timeSinceFailure = Date.now() - (this.state.lastFailure || 0);
      
      if (timeSinceFailure > this.RECOVERY_TIME) {
        console.log(`🟡 [CircuitBreaker] Tentando recuperação...`);
        this.state.status = 'HALF_OPEN';
        return false;
      }
      
      return true;
    }
    
    return false;
  }

  getStatus() {
    return {
      ...this.state,
      shouldBlock: this.isOpen()
    };
  }

  reset() {
    console.log(`🔄 [CircuitBreaker] Reset manual`);
    this.state = {
      status: 'CLOSED',
      failures: 0,
      lastFailure: null,
      lastSuccess: null
    };
  }
}

export const globalCircuitBreaker = new GlobalCircuitBreaker();
