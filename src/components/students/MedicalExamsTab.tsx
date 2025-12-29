import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Calendar, Heart, Droplet, Camera, Plus, Eye } from 'lucide-react'
import { useMedicalExams } from '@/hooks/useMedicalExams'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MedicalExamsTabProps {
  studentUserId: string
  studentName: string
}

export function MedicalExamsTab({ studentUserId, studentName }: MedicalExamsTabProps) {
  const { medicalExams, loading, getExamsByCategory, getExamsStats } = useMedicalExams(studentUserId)

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          Carregando exames médicos...
        </div>
      </div>
    )
  }

  const stats = getExamsStats()
  const categories = getExamsByCategory()

  const examCategories = [
    {
      key: 'blood',
      label: 'Exames de Sangue',
      icon: Droplet,
      color: 'text-red-500',
      exams: categories.blood
    },
    {
      key: 'cardio',
      label: 'Exames Cardiológicos',
      icon: Heart,
      color: 'text-pink-500',
      exams: categories.cardio
    },
    {
      key: 'imaging',
      label: 'Exames de Imagem',
      icon: Camera,
      color: 'text-blue-500',
      exams: categories.imaging
    },
    {
      key: 'others',
      label: 'Outros Exames',
      icon: FileText,
      color: 'text-gray-500',
      exams: categories.others
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

  if (medicalExams.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Solicitar Exame
          </Button>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhum exame médico encontrado</h3>
          <p className="text-muted-foreground">
            {studentName} ainda não enviou exames médicos. 
            Os exames enviados pelo app aparecerão automaticamente aqui.
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
          Solicitar Exame
        </Button>
        <div className="flex gap-4 ml-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{stats.recent}</div>
            <div className="text-sm text-muted-foreground">Último Mês</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-info">{stats.lastSixMonths}</div>
            <div className="text-sm text-muted-foreground">Últimos 6 Meses</div>
          </div>
        </div>
      </div>

      {/* Exam Categories */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {examCategories.map(category => {
          const Icon = category.icon
          return (
            <Card key={category.key} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${category.color}`} />
                  <Badge variant="outline" className="text-xs">
                    {category.exams.length}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">{category.label}</div>
                  {category.exams.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Último: {formatRelativeTime(category.exams[0].date)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Exams */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Exames Recentes
          </CardTitle>
          <CardDescription>
            Últimos exames médicos enviados por {studentName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {medicalExams.slice(0, 10).map(exam => {
              const category = examCategories.find(cat => 
                cat.exams.some(e => e.id === exam.id)
              ) || examCategories[3] // Default to 'others'
              const Icon = category.icon
              
              return (
                <div 
                  key={exam.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${category.color}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {exam.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(exam.date).toLocaleDateString('pt-BR')} • {formatRelativeTime(exam.date)}
                      </div>
                      {exam.notes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {exam.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {exam.file_url && (
                      <Badge variant="outline" className="text-xs text-success border-success">
                        Arquivo
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="text-primary hover:text-primary">
                        <Eye className="w-3 h-3" />
                      </Button>
                      {exam.file_url && (
                        <Button size="sm" variant="ghost" className="text-success hover:text-success">
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Exam Categories Details */}
      {examCategories.filter(cat => cat.exams.length > 0).map(category => (
        <Card key={category.key} className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <category.icon className={`w-5 h-5 ${category.color}`} />
              {category.label}
            </CardTitle>
            <CardDescription>
              Histórico de {category.label.toLowerCase()} de {studentName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {category.exams.map(exam => (
                <div 
                  key={exam.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${category.color.replace('text-', 'bg-')}`}></div>
                    <div>
                      <div className="font-medium text-foreground">{exam.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(exam.date).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {exam.file_url && (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </Badge>
                    )}
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}