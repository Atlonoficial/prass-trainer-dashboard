interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: number
  success: boolean
  error?: string
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 100

  startTimer(operation: string): (success?: boolean, error?: string) => void {
    const start = performance.now()
    const timestamp = Date.now()

    return (success: boolean = true, error?: string) => {
      const duration = performance.now() - start
      
      this.addMetric({
        operation,
        duration,
        timestamp,
        success,
        error
      })
    }
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log slow operations (> 2 seconds)
    if (metric.duration > 2000) {
      console.warn(`[Performance] Slow operation detected:`, {
        operation: metric.operation,
        duration: `${Math.round(metric.duration)}ms`,
        success: metric.success,
        error: metric.error
      })
    }

    // Log to console for debugging
    console.log(`[Performance] ${metric.operation}: ${Math.round(metric.duration)}ms`, {
      success: metric.success,
      error: metric.error
    })
  }

  getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation)
    }
    return [...this.metrics]
  }

  getAverageTime(operation: string): number {
    const operationMetrics = this.getMetrics(operation).filter(m => m.success)
    if (operationMetrics.length === 0) return 0
    
    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0)
    return total / operationMetrics.length
  }

  getStats(): Record<string, any> {
    const operations = [...new Set(this.metrics.map(m => m.operation))]
    
    return operations.reduce((stats, operation) => {
      const metrics = this.getMetrics(operation)
      const successful = metrics.filter(m => m.success)
      const failed = metrics.filter(m => !m.success)
      
      stats[operation] = {
        total: metrics.length,
        successful: successful.length,
        failed: failed.length,
        averageTime: successful.length > 0 
          ? Math.round(successful.reduce((sum, m) => sum + m.duration, 0) / successful.length)
          : 0,
        slowestTime: metrics.length > 0 
          ? Math.round(Math.max(...metrics.map(m => m.duration)))
          : 0
      }
      
      return stats
    }, {} as Record<string, any>)
  }

  clear() {
    this.metrics = []
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor()

// Helper hook for React components
export function usePerformanceTimer(operation: string) {
  return performanceMonitor.startTimer(operation)
}
