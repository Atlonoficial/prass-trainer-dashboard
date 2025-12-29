import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCircuitBreakerStatus, forceResetCircuit } from '@/utils/supabaseHealthCheck'
import { useGlobalLoading } from '@/hooks/useGlobalLoading'
import { performanceMonitor } from '@/utils/performanceMonitor'
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function HealthCheck() {
  const [circuitStatus, setCircuitStatus] = useState(getCircuitBreakerStatus())
  const [perfStats, setPerfStats] = useState<any[]>([])
  const { loading } = useGlobalLoading()

  const refresh = () => {
    setCircuitStatus(getCircuitBreakerStatus())
    setPerfStats(performanceMonitor.getStats())
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleForceReset = () => {
    forceResetCircuit()
    refresh()
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">System Health Check</h1>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Circuit Breaker Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {circuitStatus.isHealthy ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Circuit Breaker Status
            </CardTitle>
            <CardDescription>Supabase connection health monitoring</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">State</p>
                <Badge variant={circuitStatus.state === 'CLOSED' ? 'default' : 'destructive'}>
                  {circuitStatus.state}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failure Count</p>
                <p className="text-lg font-semibold">{circuitStatus.failureCount} / 3</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Check</p>
                <p className="text-sm">
                  {circuitStatus.lastCheck 
                    ? new Date(circuitStatus.lastCheck).toLocaleTimeString()
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Failure</p>
                <p className="text-sm">
                  {circuitStatus.lastFailure 
                    ? new Date(circuitStatus.lastFailure).toLocaleTimeString()
                    : 'None'}
                </p>
              </div>
            </div>
            
            {circuitStatus.isCircuitOpen && (
              <Button onClick={handleForceReset} variant="outline" size="sm">
                Force Reset Circuit
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Loading States */}
        <Card>
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
            <CardDescription>Current application loading indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(loading).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{key}</span>
                  {value ? (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Average operation durations</CardDescription>
          </CardHeader>
          <CardContent>
            {perfStats.length > 0 ? (
              <div className="space-y-2">
                {perfStats.map((stat) => (
                  <div key={stat.name} className="flex justify-between items-center">
                    <span className="text-sm">{stat.name}</span>
                    <div className="text-right">
                      <p className="text-sm font-mono">
                        avg: {stat.avg.toFixed(2)}ms
                      </p>
                      <p className="text-xs text-muted-foreground">
                        min: {stat.min.toFixed(0)}ms | max: {stat.max.toFixed(0)}ms
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No metrics recorded yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
