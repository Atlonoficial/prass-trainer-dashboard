import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { WorkoutPlanModal } from './WorkoutPlanModal'
import { WorkoutPlanDetailsModal } from './WorkoutPlanDetailsModal'
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans'
import { WorkoutPlan } from '@/services/workoutPlansService'
import { Plus, MoreVertical, Dumbbell, Users, Calendar, Edit, Copy, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface WorkoutPlansManagerProps {
  studentId?: string
  showStudentView?: boolean
}

export function WorkoutPlansManager({ studentId, showStudentView = false }: WorkoutPlansManagerProps) {
  const {
    workoutPlans,
    loading,
    createWorkoutPlan,
    updateWorkoutPlan,
    deleteWorkoutPlan,
    assignToStudent,
    removeFromStudent,
    getWorkoutPlansByStudent
  } = useWorkoutPlans()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null)

  const displayPlans = showStudentView && studentId 
    ? getWorkoutPlansByStudent(studentId)
    : workoutPlans

  const handleCreatePlan = () => {
    setEditingPlan(null)
    setIsModalOpen(true)
  }

  const handleEditPlan = (plan: WorkoutPlan) => {
    setEditingPlan(plan)
    setIsModalOpen(true)
  }

  const handleViewDetails = (plan: WorkoutPlan) => {
    setSelectedPlan(plan)
    setIsDetailsModalOpen(true)
  }

  const handleDuplicatePlan = async (plan: WorkoutPlan) => {
    const duplicatedPlan = {
      name: `${plan.name} (Cópia)`,
      description: plan.description,
      exercises_data: plan.exercises_data,
      difficulty: plan.difficulty,
      duration_weeks: plan.duration_weeks,
      sessions_per_week: plan.sessions_per_week,
      tags: plan.tags,
      notes: plan.notes,
      is_template: plan.is_template
    }

    const result = await createWorkoutPlan(duplicatedPlan)
    if (result) {
      toast.success('Plano duplicado com sucesso!')
    }
  }

  const handleDeletePlan = async (plan: WorkoutPlan) => {
    if (!confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) {
      return
    }

    await deleteWorkoutPlan(plan.id!)
  }

  const handleAssignToStudent = async (plan: WorkoutPlan) => {
    if (!studentId) return
    
    const isAssigned = plan.assigned_students?.includes(studentId)
    
    if (isAssigned) {
      await removeFromStudent(plan.id!, studentId)
      toast.success('Plano removido do aluno')
    } else {
      await assignToStudent(plan.id!, studentId)
      toast.success('Plano atribuído ao aluno')
    }
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'advanced': return 'bg-red-500/10 text-red-500 border-red-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'inactive': return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {showStudentView ? 'Meus Planos de Treino' : 'Planos de Treino'}
          </h2>
          <p className="text-muted-foreground">
            {showStudentView 
              ? 'Seus planos de treino atribuídos' 
              : 'Gerencie seus planos de treino'
            }
          </p>
        </div>
        
        {!showStudentView && (
          <Button onClick={handleCreatePlan} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Novo Plano
          </Button>
        )}
      </div>

      {/* Plans Grid */}
      {displayPlans.length === 0 ? (
        <div className="text-center py-12">
          <Dumbbell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">
            {showStudentView ? "Nenhum plano atribuído" : "Nenhum plano criado"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {showStudentView 
              ? "Você ainda não possui planos de treino atribuídos."
              : "Comece criando seu primeiro plano de treino."
            }
          </p>
          {!showStudentView && (
            <Button onClick={handleCreatePlan} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Plano
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayPlans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-foreground mb-1">
                      {plan.name}
                    </CardTitle>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {plan.description}
                      </p>
                    )}
                  </div>
                  
                  {!showStudentView && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(plan)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditPlan(plan)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicatePlan(plan)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        {studentId && (
                          <DropdownMenuItem onClick={() => handleAssignToStudent(plan)}>
                            <Users className="w-4 h-4 mr-2" />
                            {plan.assigned_students?.includes(studentId) ? 'Remover do Aluno' : 'Atribuir ao Aluno'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDeletePlan(plan)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={getDifficultyColor(plan.difficulty)}>
                      {plan.difficulty === 'beginner' && 'Iniciante'}
                      {plan.difficulty === 'intermediate' && 'Intermediário'}
                      {plan.difficulty === 'advanced' && 'Avançado'}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(plan.status)}>
                      {plan.status === 'active' && 'Ativo'}
                      {plan.status === 'inactive' && 'Inativo'}
                      {plan.status === 'completed' && 'Concluído'}
                    </Badge>
                    {plan.is_template && (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                        Template
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-1" />
                      {plan.duration_weeks}w
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Dumbbell className="w-4 h-4 mr-1" />
                      {plan.sessions_per_week}x/sem
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Users className="w-4 h-4 mr-1" />
                      {plan.assigned_students?.length || 0} alunos
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Dumbbell className="w-4 h-4 mr-1" />
                      {plan.exercises_data?.length || 0} exercícios
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleViewDetails(plan)}
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <WorkoutPlanModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingPlan(null)
        }}
        editingPlan={editingPlan}
        onSave={editingPlan 
          ? (planData) => updateWorkoutPlan(editingPlan.id!, planData)
          : createWorkoutPlan
        }
      />

      <WorkoutPlanDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedPlan(null)
        }}
        plan={selectedPlan}
      />
    </div>
  )
}