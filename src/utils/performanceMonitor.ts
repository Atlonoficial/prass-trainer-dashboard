interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private startTimes: Map<string, number> = new Map()
  private maxMetrics = 100

  start(metricName: string) {
    this.startTimes.set(metricName, performance.now())
  }

  end(metricName: string) {
    const startTime = this.startTimes.get(metricName)
    if (!startTime) {
      console.warn(`[Performance] No start time found for ${metricName}`)
      return
    }

    const duration = performance.now() - startTime
    this.metrics.push({
      name: metricName,
      duration,
      timestamp: Date.now()
    })

    this.startTimes.delete(metricName)

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }

    console.log(`[Performance] ${metricName}: ${duration.toFixed(2)}ms`)
  }

  getMetrics(metricName?: string) {
    if (metricName) {
      return this.metrics.filter(m => m.name === metricName)
    }
    return [...this.metrics]
  }

  getAverageDuration(metricName: string) {
    const filtered = this.metrics.filter(m => m.name === metricName)
    if (filtered.length === 0) return 0

    const sum = filtered.reduce((acc, m) => acc + m.duration, 0)
    return sum / filtered.length
  }

  getStats() {
    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = []
      }
      acc[metric.name].push(metric.duration)
      return acc
    }, {} as Record<string, number[]>);

    return Object.entries(grouped).map(([name, durations]) => ({
      name,
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations)
    }));
  }

  clear() {
    this.metrics = []
    this.startTimes.clear()
  }

  logStats() {
    console.table(this.getStats())
  }
}

export const performanceMonitor = new PerformanceMonitor()
