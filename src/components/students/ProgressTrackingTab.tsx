import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Scale, Dumbbell, Activity, Target, Calendar, Plus } from 'lucide-react'
import { useProgress } from '@/hooks/useProgress'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface ProgressTrackingTabProps {
  studentUserId: string
  studentName: string
}

export function ProgressTrackingTab({ studentUserId, studentName }: ProgressTrackingTabProps) {
  const { progress, loading, getProgressByType, getLatestProgress, getProgressStats } = useProgress(studentUserId)

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          Carregando dados de progresso...
        </div>
      </div>
    )
  }

  const stats = getProgressStats()

  const progressTypes = [
    { key: 'weight', label: 'Peso', icon: Scale, color: 'text-blue-500', unit: 'kg' },
    { key: 'body_fat', label: 'Gordura Corporal', icon: Activity, color: 'text-orange-500', unit: '%' },
    { key: 'muscle_mass', label: 'Massa Muscular', icon: Dumbbell, color: 'text-green-500', unit: 'kg' },
    { key: 'strength', label: 'Força', icon: TrendingUp, color: 'text-purple-500', unit: 'kg' },
  ]

  // Prepare chart data for weight evolution
  const weightData = getProgressByType('weight').reverse().map(entry => ({
    date: new Date(entry.date).toLocaleDateString('pt-BR'),
    value: entry.value
  }))

  // Prepare chart data for strength progression (latest 10 entries)
  const strengthData = getProgressByType('strength').slice(0, 10).reverse().map(entry => ({
    exercise: entry.notes || 'Exercício',
    value: entry.value,
    date: new Date(entry.date).toLocaleDateString('pt-BR')
  }))

  if (progress.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Progresso
          </Button>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhum progresso registrado</h3>
          <p className="text-muted-foreground">
            {studentName} ainda não tem dados de progresso. 
            Os registros de evolução feitos no app aparecerão automaticamente aqui.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Progresso
        </Button>
        <div className="flex gap-4 ml-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{stats.thisWeek}</div>
            <div className="text-sm text-muted-foreground">Esta Semana</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-info">{stats.thisMonth}</div>
            <div className="text-sm text-muted-foreground">Este Mês</div>
          </div>
        </div>
      </div>

      {/* Progress Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {progressTypes.map(type => {
          const latest = getLatestProgress(type.key)
          const typeData = getProgressByType(type.key)
          const Icon = type.icon

          return (
            <Card key={type.key} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${type.color}`} />
                  <Badge variant="outline" className="text-xs">
                    {typeData.length}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">{type.label}</div>
                  <div className="text-lg font-bold text-foreground">
                    {latest ? `${latest.value} ${type.unit}` : '-'}
                  </div>
                  {latest && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(latest.date).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Evolution Chart */}
        {weightData.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-500" />
                Evolução do Peso
              </CardTitle>
              <CardDescription>
                Acompanhamento da variação de peso ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '6px' 
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Strength Progression Chart */}
        {strengthData.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-green-500" />
                Progressão de Força
              </CardTitle>
              <CardDescription>
                Evolução das cargas nos exercícios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={strengthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="exercise" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '6px' 
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Progress Entries */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Registros Recentes
          </CardTitle>
          <CardDescription>
            Últimos registros de progresso de {studentName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {progress.slice(0, 10).map(entry => {
              const type = progressTypes.find(t => t.key === entry.type)
              const Icon = type?.icon || TrendingUp
              
              return (
                <div 
                  key={entry.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${type?.color || 'text-foreground'}`} />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {type?.label || entry.type}: {entry.value} {entry.unit}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  {entry.notes && (
                    <Badge variant="outline" className="text-xs">
                      {entry.notes}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}