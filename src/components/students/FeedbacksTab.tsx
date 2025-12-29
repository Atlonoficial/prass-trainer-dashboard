import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Star, Dumbbell, Utensils, User, Calendar, TrendingUp } from 'lucide-react'
import { useFeedbacks } from '@/hooks/useFeedbacks'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FeedbacksTabProps {
  studentUserId: string
  studentName: string
}

export function FeedbacksTab({ studentUserId, studentName }: FeedbacksTabProps) {
  const { feedbacks, loading, getFeedbacksByType, getAverageRating, getFeedbackStats, getRatingDistribution } = useFeedbacks(studentUserId)

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          Carregando feedbacks...
        </div>
      </div>
    )
  }

  const stats = getFeedbackStats()
  const ratingDistribution = getRatingDistribution()

  const feedbackTypes = [
    {
      key: 'workout',
      label: 'Treinos',
      icon: Dumbbell,
      color: 'text-blue-500',
      feedbacks: getFeedbacksByType('workout')
    },
    {
      key: 'diet',
      label: 'Dieta',
      icon: Utensils,
      color: 'text-green-500',
      feedbacks: getFeedbacksByType('diet')
    },
    {
      key: 'general',
      label: 'Geral',
      icon: User,
      color: 'text-purple-500',
      feedbacks: getFeedbacksByType('general')
    }
  ]

  const formatRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { 
        addSuffix: true,
        locale: ptBR
      })
    } catch {
      return 'Data inválida'
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-3 h-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))
  }

  if (feedbacks.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhum feedback encontrado</h3>
          <p className="text-muted-foreground">
            {studentName} ainda não enviou feedbacks. 
            Os feedbacks sobre treinos e dietas aparecerão automaticamente aqui.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">{stats.thisWeek}</div>
            <div className="text-sm text-muted-foreground">Esta Semana</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-info">{stats.thisMonth}</div>
            <div className="text-sm text-muted-foreground">Este Mês</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <div className="text-2xl font-bold text-foreground">{stats.averageRating}</div>
            </div>
            <div className="text-sm text-muted-foreground">Média</div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {feedbackTypes.map(type => {
          const Icon = type.icon
          const avgRating = getAverageRating(type.key)
          
          return (
            <Card key={type.key} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${type.color}`} />
                    <span className="font-medium text-foreground">{type.label}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {type.feedbacks.length}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {renderStars(Math.round(avgRating))}
                    </div>
                    <span className="text-sm text-muted-foreground">{avgRating}</span>
                  </div>
                  
                  {type.feedbacks.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Último feedback {formatRelativeTime(type.feedbacks[0].created_at)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Rating Distribution */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Distribuição de Avaliações
          </CardTitle>
          <CardDescription>
            Como {studentName} tem avaliado os serviços
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(ratingDistribution).reverse().map(([rating, count]) => (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium">{rating}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-muted rounded-full h-2 relative">
                  <div 
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ 
                      width: `${feedbacks.length > 0 ? (count / feedbacks.length) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Feedbacks */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Feedbacks Recentes
          </CardTitle>
          <CardDescription>
            Últimas avaliações e comentários de {studentName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedbacks.map(feedback => {
              const type = feedbackTypes.find(t => t.key === feedback.type)
              const Icon = type?.icon || MessageSquare
              
              return (
                <div 
                  key={feedback.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-1 ${type?.color || 'text-foreground'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {type?.label || feedback.type}
                        </Badge>
                        <div className="flex gap-1">
                          {renderStars(feedback.rating)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(feedback.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{feedback.message}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}