import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useEvaluations } from '@/hooks/useEvaluations'
import { useComprehensiveEvaluations, Evaluation } from '@/hooks/useComprehensiveEvaluations'
import { useEvaluationRequests } from '@/hooks/useEvaluationRequests'
import { useSupabaseProfile } from '@/hooks/useSupabaseProfile'
import { ComprehensiveEvaluationModal } from './ComprehensiveEvaluationModal'
import { EvaluationDetailsModal } from './EvaluationDetailsModal'
import { RequestEvaluationModal } from './RequestEvaluationModal'
import { StudentEvaluationRequestModal } from './StudentEvaluationRequestModal'
import { 
  Scale, Ruler, Heart, Activity, TrendingUp, Plus, FileText, Eye,
  ClipboardCheck, BarChart3, Calendar, Send, Bell
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { translateEvaluationField, formatEvaluationValue } from '@/lib/evaluationFieldsMapping'

interface StudentEvaluationsTabProps {
  studentId?: string
  studentName: string
}

export function StudentEvaluationsTab({ studentId, studentName }: StudentEvaluationsTabProps) {
  const { evaluations: legacyEvaluations, loading: legacyLoading, getEvaluationsByType, getLatestEvaluationByType, getEvaluationStats } = useEvaluations(studentId)
  const { evaluations: comprehensiveEvaluations, loading: comprehensiveLoading, createEvaluation, getEvaluationStats: getComprehensiveStats } = useComprehensiveEvaluations(studentId)
  const { requests: evaluationRequests, loading: requestsLoading, createRequest, completeRequest, getPendingRequests } = useEvaluationRequests(studentId)
  const { profile } = useSupabaseProfile()
  
  const [showComprehensiveModal, setShowComprehensiveModal] = useState(false)
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'comprehensive' | 'legacy'>('all')

  const loading = legacyLoading || comprehensiveLoading || requestsLoading
  const stats = getEvaluationStats()
  const comprehensiveStats = getComprehensiveStats()
  const pendingRequests = getPendingRequests()
  const isTeacher = profile?.user_type === 'teacher'
  const isStudent = profile?.user_type === 'student'

  const handleCreateEvaluation = async (data: any) => {
    await createEvaluation(data)
  }

  const handleCreateRequest = async (data: any) => {
    await createRequest(data)
  }

  const evaluationTypes = [
    { key: 'weight', label: 'Peso', icon: Scale, color: 'text-blue-600' },
    { key: 'height', label: 'Altura', icon: Ruler, color: 'text-green-600' },
    { key: 'body_fat', label: 'Gordura Corporal', icon: Activity, color: 'text-orange-600' },
    { key: 'muscle_mass', label: 'Massa Muscular', icon: TrendingUp, color: 'text-purple-600' },
    { key: 'blood_pressure', label: 'Pressão Arterial', icon: Heart, color: 'text-red-600' },
  ]

  const formatRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR })
    } catch {
      return 'Data inválida'
    }
  }

  const formatValue = (evaluation: any) => formatEvaluationValue(evaluation.type, evaluation.value || 0)

  const filteredComprehensiveEvaluations = activeTab === 'legacy' ? [] : comprehensiveEvaluations
  const filteredLegacyEvaluations = activeTab === 'comprehensive' ? [] : legacyEvaluations

  const combinedStats = {
    total: comprehensiveStats.total + stats.total,
    thisMonth: comprehensiveStats.thisMonth + stats.thisMonth,
  }

  if (loading) return <div className="p-6"><div className="text-center py-12 text-muted-foreground">Carregando avaliações...</div></div>
  if (legacyEvaluations.length === 0 && comprehensiveEvaluations.length === 0) {
    return (
      <div className="p-6"><div className="text-center py-8">
        <ClipboardCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação encontrada</h3>
        <Button onClick={() => setShowComprehensiveModal(true)}><Plus className="w-4 h-4 mr-2" />Nova Avaliação</Button>
      </div></div>
    )
  }

  return (
    <div className="space-y-6">
      {isStudent && pendingRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader><CardTitle className="flex items-center gap-2 text-amber-800"><Bell className="w-5 h-5" />Avaliações Solicitadas ({pendingRequests.length})</CardTitle></CardHeader>
          <CardContent><div className="space-y-3">{pendingRequests.map((request) => (
            <Card key={request.id} className="bg-white"><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><h4 className="font-medium">{request.template?.name}</h4></div>
                <Button onClick={() => { setSelectedRequest(request); setShowRequestDetailsModal(true) }}>Preencher</Button>
              </div>
            </CardContent></Card>
          ))}</div></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5" />Avaliações & Medidas</CardTitle>
              <CardDescription>Histórico completo de avaliações e medidas</CardDescription>
            </div>
            <div className="flex gap-2">
              {isTeacher && studentId && <Button variant="outline" onClick={() => setShowRequestModal(true)}><Send className="w-4 h-4 mr-2" />Solicitar</Button>}
              {isTeacher && <Button onClick={() => setShowComprehensiveModal(true)}><Plus className="w-4 h-4 mr-2" />Nova Avaliação</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="all">Todas ({combinedStats.total})</TabsTrigger>
              <TabsTrigger value="comprehensive">Avaliações Completas ({comprehensiveStats.total})</TabsTrigger>
              <TabsTrigger value="legacy">Histórico de Medidas ({stats.total})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredComprehensiveEvaluations.map((e) => (
                <Card 
                  key={e.id} 
                  className="cursor-pointer border-l-4 border-l-blue-500 hover:shadow-md transition-shadow" 
                  onClick={() => { setSelectedEvaluation(e); setShowDetailsModal(true) }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <h4 className="font-semibold text-base">
                            {e.template?.name || 'Avaliação Completa'}
                          </h4>
                          <Badge variant={e.status === 'completed' ? 'default' : 'secondary'}>
                            {e.status === 'completed' ? 'Completa' : 'Pendente'}
                          </Badge>
                        </div>
                        
                        {e.student_name && (
                          <p className="text-sm text-muted-foreground mb-1">
                            Aluno: {e.student_name}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatRelativeTime(e.evaluation_date)}</span>
                          </div>
                          
                          {e.overall_score && (
                            <div className="flex items-center gap-1">
                              <BarChart3 className="w-4 h-4" />
                              <span>Nota: {e.overall_score.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Eye className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {evaluationTypes.map((type) => {
                const evals = getEvaluationsByType(type.key)
                if (evals.length === 0) return null
                const Icon = type.icon
                
                return evals.map((evaluation) => (
                  <Card 
                    key={evaluation.id} 
                    className="cursor-pointer border-l-4 border-l-orange-500 hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`w-5 h-5 ${type.color}`} />
                            <h4 className="font-semibold text-base">{type.label}</h4>
                          </div>
                          
                          <div className="text-2xl font-bold text-primary mb-1">
                            {formatValue(evaluation)}
                          </div>
                          
                          {evaluation.student_name && (
                            <p className="text-sm text-muted-foreground mb-1">
                              Aluno: {evaluation.student_name}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{formatRelativeTime(evaluation.date)}</span>
                          </div>
                          
                          {evaluation.notes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              {evaluation.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              })}
            </TabsContent>

            <TabsContent value="comprehensive" className="space-y-4">
              {comprehensiveEvaluations.map((e) => (
                <Card 
                  key={e.id} 
                  className="cursor-pointer border-l-4 border-l-blue-500 hover:shadow-md transition-shadow" 
                  onClick={() => { setSelectedEvaluation(e); setShowDetailsModal(true) }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <h4 className="font-semibold text-base">
                            {e.template?.name || 'Avaliação Completa'}
                          </h4>
                          <Badge variant={e.status === 'completed' ? 'default' : 'secondary'}>
                            {e.status === 'completed' ? 'Completa' : 'Pendente'}
                          </Badge>
                        </div>
                        
                        {e.student_name && (
                          <p className="text-sm text-muted-foreground mb-1">
                            Aluno: {e.student_name}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatRelativeTime(e.evaluation_date)}</span>
                          </div>
                          
                          {e.overall_score && (
                            <div className="flex items-center gap-1">
                              <BarChart3 className="w-4 h-4" />
                              <span>Nota: {e.overall_score.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Eye className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="legacy" className="space-y-4">
              {evaluationTypes.map((type) => {
                const evals = getEvaluationsByType(type.key)
                if (evals.length === 0) return null
                const Icon = type.icon
                
                return evals.map((evaluation) => (
                  <Card 
                    key={evaluation.id} 
                    className="cursor-pointer border-l-4 border-l-orange-500 hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`w-5 h-5 ${type.color}`} />
                            <h4 className="font-semibold text-base">{type.label}</h4>
                          </div>
                          
                          <div className="text-2xl font-bold text-primary mb-1">
                            {formatValue(evaluation)}
                          </div>
                          
                          {evaluation.student_name && (
                            <p className="text-sm text-muted-foreground mb-1">
                              Aluno: {evaluation.student_name}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{formatRelativeTime(evaluation.date)}</span>
                          </div>
                          
                          {evaluation.notes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              {evaluation.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              })}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showComprehensiveModal && (
        <ComprehensiveEvaluationModal
          open={showComprehensiveModal}
          onOpenChange={setShowComprehensiveModal}
          onSubmit={handleCreateEvaluation}
          studentId={studentId || ''}
          studentName={studentName}
        />
      )}

      {selectedEvaluation && showDetailsModal && (
        <EvaluationDetailsModal
          open={showDetailsModal}
          onOpenChange={(open) => {
            setShowDetailsModal(open)
            if (!open) setSelectedEvaluation(null)
          }}
          evaluation={selectedEvaluation}
        />
      )}

      {showRequestModal && (
        <RequestEvaluationModal
          open={showRequestModal}
          onOpenChange={setShowRequestModal}
          onSubmit={handleCreateRequest}
          studentId={studentId || ''}
          studentName={studentName}
        />
      )}

      {selectedRequest && showRequestDetailsModal && (
        <StudentEvaluationRequestModal
          open={showRequestDetailsModal}
          onOpenChange={(open) => {
            setShowRequestDetailsModal(open)
            if (!open) setSelectedRequest(null)
          }}
          request={selectedRequest}
          onComplete={completeRequest}
        />
      )}
    </div>
  )
}
