import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, MessageSquare, TrendingUp, Calendar, User, Filter, Search, Settings } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { TeacherFeedbackSettings } from './TeacherFeedbackSettings'
import { useTeacherFeedbackSettings } from '@/hooks/useTeacherFeedbackSettings'

interface Feedback {
  id: string
  student_id: string
  teacher_id: string
  type: 'workout' | 'diet' | 'general'
  rating: number
  message: string
  related_item_id?: string
  created_at: string
  updated_at: string
  student?: {
    name: string
    email: string
  }
}

export function FeedbacksOverview() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'workout' | 'diet' | 'general'>('all')
  const [periodFilter, setPeriodFilter] = useState<'7' | '30' | '60' | '90'>('30')
  const [currentPage, setCurrentPage] = useState(1)
  const { toast } = useToast()
  const { settings } = useTeacherFeedbackSettings()

  const fetchFeedbacks = async () => {
    try {
      setLoading(true)
      
      // Buscar feedbacks do professor logado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Apply period filter based on settings or filter selection
      const daysBack = parseInt(periodFilter) || settings?.default_feedback_period || 30
      const periodDate = new Date()
      periodDate.setDate(periodDate.getDate() - daysBack)
      
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('teacher_id', user.id)
        .gte('created_at', periodDate.toISOString())
        .order('created_at', { ascending: false })
      
      if (error) throw error

      // Buscar perfis dos alunos dos feedbacks
      const studentIds = [...new Set((data || []).map(f => f.student_id))]
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', studentIds)

      if (profilesError) console.warn('Profiles error:', profilesError)
      
      // Mapear os dados com informações do aluno
      const feedbacksWithStudent = (data || []).map(feedback => {
        const profile = profiles?.find(p => p.id === feedback.student_id)
        return {
          ...feedback,
          student: {
            name: profile?.name || profile?.email || 'Aluno',
            email: profile?.email || ''
          }
        }
      })
      
      setFeedbacks(feedbacksWithStudent as Feedback[])
    } catch (error) {
      console.error('Error fetching feedbacks:', error)
      toast({
        title: "Erro ao carregar feedbacks",
        description: "Não foi possível carregar os feedbacks.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [periodFilter, settings])

  // Filter feedbacks based on search and type
  useEffect(() => {
    let filtered = feedbacks

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(f => f.type === typeFilter)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.student?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredFeedbacks(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [feedbacks, typeFilter, searchTerm])

  const getFeedbackStats = () => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    return {
      total: filteredFeedbacks.length,
      thisWeek: filteredFeedbacks.filter(f => new Date(f.created_at) >= oneWeekAgo).length,
      thisMonth: filteredFeedbacks.filter(f => new Date(f.created_at) >= oneMonthAgo).length,
      averageRating: filteredFeedbacks.length > 0 
        ? Math.round((filteredFeedbacks.reduce((acc, f) => acc + f.rating, 0) / filteredFeedbacks.length) * 10) / 10
        : 0
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'workout': return 'Treino'
      case 'diet': return 'Dieta'
      case 'general': return 'Geral'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'workout': return 'bg-primary text-primary-foreground'
      case 'diet': return 'bg-success text-success-foreground'
      case 'general': return 'bg-info text-info-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
      />
    ))
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Hoje'
    if (diffInDays === 1) return 'Ontem'
    if (diffInDays < 7) return `${diffInDays} dias atrás`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} semanas atrás`
    return `${Math.floor(diffInDays / 30)} meses atrás`
  }

  const stats = getFeedbackStats()
  const itemsPerPage = settings?.feedbacks_per_page || 10
  const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage)
  const paginatedFeedbacks = filteredFeedbacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid gap-6">
          <Card className="border-border">
            <div className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-muted rounded mb-4"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="text-center">
                      <div className="h-8 bg-muted rounded mb-2"></div>
                      <div className="h-4 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid gap-6">
        {/* Header with Settings */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            Feedbacks dos Alunos
          </h2>
          <TeacherFeedbackSettings />
        </div>

        {/* Filters */}
        <Card className="border-border">
          <div className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por aluno ou mensagem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="workout">Treinos</SelectItem>
                    <SelectItem value="diet">Dieta</SelectItem>
                    <SelectItem value="general">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats - only show if enabled in settings */}
        {settings?.show_feedback_stats !== false && (
          <Card className="border-border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                📊 Estatísticas de Feedbacks
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{stats.thisWeek}</div>
                  <div className="text-sm text-muted-foreground">Esta semana</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning">{stats.thisMonth}</div>
                  <div className="text-sm text-muted-foreground">Este mês</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-info">{stats.averageRating}</div>
                  <div className="text-sm text-muted-foreground">Média geral</div>
                </div>
              </div>
            </div>
          </Card>
        )}
        
        <Card className="border-border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                💬 Feedbacks Recentes
              </h3>
              <div className="text-sm text-muted-foreground">
                {filteredFeedbacks.length} feedback{filteredFeedbacks.length !== 1 ? 's' : ''} encontrado{filteredFeedbacks.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {filteredFeedbacks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchTerm || typeFilter !== 'all' ? 'Nenhum feedback encontrado' : 'Nenhum feedback encontrado'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || typeFilter !== 'all' 
                    ? 'Tente ajustar os filtros de busca.' 
                    : 'Os feedbacks dos alunos aparecerão aqui.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedFeedbacks.map((feedback) => (
                    <div key={feedback.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {feedback.student?.name || 'Aluno'}
                            </span>
                          </div>
                          <Badge className={getTypeColor(feedback.type)}>
                            {getTypeLabel(feedback.type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {formatRelativeTime(feedback.created_at)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          {renderStars(feedback.rating)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ({feedback.rating}/5)
                        </span>
                      </div>
                      
                      <p className="text-foreground leading-relaxed">
                        {feedback.message}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8"
                          >
                            {page}
                          </Button>
                        )
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="text-muted-foreground">...</span>
                          <Button
                            variant={currentPage === totalPages ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            className="w-8"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}