import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Edit, Copy, Trash2, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import WorkoutModal from './WorkoutModal';
import WorkoutDetailModal from './WorkoutDetailModal';
import WorkoutSelectionModal from './WorkoutSelectionModal';
import WorkoutLibraryModal from '../predefinitions/WorkoutLibraryModal';

interface TrainingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentId: string;
  editingPlan?: any;
}

export default function TrainingPlanModal({ isOpen, onClose, studentName, studentId, editingPlan }: TrainingPlanModalProps) {
  const [currentView, setCurrentView] = useState<'initial' | 'create' | 'edit'>('initial');
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showWorkoutDetailModal, setShowWorkoutDetailModal] = useState(false);
  const [showWorkoutSelectionModal, setShowWorkoutSelectionModal] = useState(false);
  const [showWorkoutLibraryModal, setShowWorkoutLibraryModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  
  const {
    workoutPlans,
    loading,
    createWorkoutPlan,
    updateWorkoutPlan,
    deleteWorkoutPlan,
    getWorkoutPlansByStudent,
    assignToStudent,
    removeFromStudent
  } = useWorkoutPlans();

  // Get student plans
  const studentPlans = workoutPlans.filter(plan => 
    plan.assigned_students?.includes(studentId)
  );

  useEffect(() => {
    if (isOpen) {
      if (editingPlan) {
        setCurrentView('edit');
        setCurrentPlan({
          id: editingPlan.id,
          name: editingPlan.name,
          description: editingPlan.description || '',
          isActive: editingPlan.status === 'active',
          exercises_data: editingPlan.exercises_data || [],
          notes: editingPlan.notes || '',
          startDate: editingPlan.created_at ? new Date(editingPlan.created_at).toISOString().split('T')[0] : '',
          endDate: ''
        });
      } else {
        setCurrentView('initial');
        setCurrentPlan({
          name: `Plano de Treino de ${studentName}`,
          description: `Plano personalizado para ${studentName}`,
          isActive: true,
          exercises_data: [],
          notes: '',
          startDate: '',
          endDate: ''
        });
      }
    }
  }, [isOpen, editingPlan, studentName]);

  const handleCreateNew = () => {
    setCurrentView('create');
  };

  const handleUseTemplate = (template: any) => {
    // Convert template to plan format
    setCurrentPlan({
      name: `${template.name} - ${studentName}`,
      description: template.description || `Plano baseado no template: ${template.name}`,
      isActive: true,
      exercises_data: template.exercises || [],
      notes: `Template original: ${template.name}`,
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    });
    setCurrentView('create');
    toast.success(`Template "${template.name}" carregado!`);
  };

  const handleSavePlan = async () => {
    try {
      if (!currentPlan) {
        toast.error("Dados do plano não encontrados");
        return;
      }

      const planData = {
        name: currentPlan.name || currentPlan.description,
        description: currentPlan.description,
        exercises_data: currentPlan.exercises_data || [],
        notes: currentPlan.notes || '',
        status: currentPlan.isActive ? 'active' as const : 'inactive' as const,
        assigned_students: [studentId],
        created_by: '' // Will be set by the service
      };

      if (editingPlan) {
        await updateWorkoutPlan(editingPlan.id, planData);
        toast.success(`Plano atualizado para ${studentName}!`);
      } else {
        const newPlan = await createWorkoutPlan(planData);
        if (newPlan) {
          await assignToStudent(newPlan.id, studentId);
        }
        toast.success(`Plano enviado para ${studentName}!`);
      }
      
      onClose();
      setCurrentView('initial');
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error("Não foi possível salvar o plano de treino");
    }
  };

  const updateCurrentPlan = (updates: any) => {
    setCurrentPlan((prev: any) => ({ ...prev, ...updates }));
  };

  const addWorkoutToPlan = (workout: any) => {
    const newWorkout = {
      id: Date.now().toString(),
      name: workout.label || workout.name,
      exercises: workout.exercises || [],
      notes: workout.observations || ''
    };
    
    setCurrentPlan((prev: any) => ({
      ...prev,
      exercises_data: [...(prev.exercises_data || []), newWorkout]
    }));
    setShowWorkoutModal(false);
    toast.success(`Treino ${workout.label} foi adicionado com sucesso.`);
  };

  const handleEditWorkout = (workout: any) => {
    setSelectedWorkout(workout);
    setShowWorkoutDetailModal(true);
  };

  const handleSaveWorkout = (updatedWorkout: any) => {
    setCurrentPlan((prev: any) => ({
      ...prev,
      exercises_data: prev.exercises_data.map((w: any) => 
        w.id === updatedWorkout.id ? updatedWorkout : w
      )
    }));
    setShowWorkoutDetailModal(false);
    toast.success("Exercícios do treino foram salvos com sucesso.");
  };

  const handleDeleteWorkout = (workoutId: string) => {
    setCurrentPlan((prev: any) => ({
      ...prev,
      exercises_data: prev.exercises_data.filter((w: any) => w.id !== workoutId)
    }));
    toast.success("O treino foi removido do plano.");
  };

  const renderInitialView = () => (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-title text-foreground mb-2">Plano de treino</h2>
        <p className="text-muted-foreground">Para {studentName}</p>
      </div>

      <Button 
        onClick={handleCreateNew}
        className="w-full btn-branded h-12 text-lg"
      >
        <Plus className="w-4 h-4 mr-2" />
        Criar novo treino
      </Button>

      <div className="text-center">
        <Button 
          onClick={() => setShowWorkoutLibraryModal(true)}
          variant="outline"
          className="w-full h-12 mb-4"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Usar Template da Biblioteca
        </Button>
        <p className="text-muted-foreground text-sm">
          Selecione um template pronto e personalize para o aluno
        </p>
      </div>

      <div className="space-y-4">
        <Label className="text-foreground">Planos salvos para este aluno</Label>
        <Select onValueChange={setSelectedPlan}>
          <SelectTrigger className="bg-background border-input">
            <SelectValue placeholder={
              studentPlans.length > 0 
                ? "Selecione um plano salvo" 
                : "Nenhum plano salvo encontrado"
            } />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {studentPlans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id} className="text-popover-foreground">
                {plan.name} - {plan.status === 'active' ? 'Ativo' : 'Inativo'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-center">
        <Button 
          onClick={() => setShowWorkoutSelectionModal(true)}
          variant="outline"
          className="mb-4"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Exercícios Individuais
        </Button>
        <p className="text-muted-foreground text-sm">
          Ou adicione exercícios específicos ao plano atual
        </p>
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    </div>
  );

  const renderCreateView = () => (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrentView('initial')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-title text-foreground">{currentPlan?.name}</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch 
            checked={currentPlan?.isActive || false}
            onCheckedChange={(checked) => updateCurrentPlan({ isActive: checked })}
          />
          <Label className="text-foreground">Habilitar plano de treino</Label>
        </div>
        <p className="text-caption text-muted-foreground">Se desativado, o cliente não poderá visualizar o plano de treino.</p>
      </div>

      <div>
        <Label className="text-foreground">Descrição do plano de treino</Label>
        <p className="text-caption text-muted-foreground mb-2">Esta descrição irá aparecer no App para o cliente</p>
        <Input
          value={currentPlan?.description || ''}
          onChange={(e) => updateCurrentPlan({ description: e.target.value })}
          className="bg-background border-input text-foreground"
          placeholder={`Plano de Treino de ${studentName}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-foreground">Definir data de início</Label>
          <p className="text-caption text-muted-foreground mb-2">Deixar em branco para desativar automação</p>
          <Input
            type="date"
            value={currentPlan?.startDate || ''}
            onChange={(e) => updateCurrentPlan({ startDate: e.target.value })}
            className="bg-background border-input text-foreground"
          />
        </div>
        <div>
          <Label className="text-foreground">Definir data de expiração</Label>
          <p className="text-caption text-muted-foreground mb-2">Deixar em branco para desativar automação</p>
          <Input
            type="date"
            value={currentPlan?.endDate || ''}
            onChange={(e) => updateCurrentPlan({ endDate: e.target.value })}
            className="bg-background border-input text-foreground"
          />
        </div>
      </div>

      <div>
        <h3 className="text-subtitle text-foreground">Treinos do Plano</h3>
        <p className="text-caption text-muted-foreground">Distribua os treinos da semana</p>
        
        {(currentPlan?.exercises_data?.length || 0) > 0 && (
          <div className="space-y-3 mt-4">
            {currentPlan.exercises_data.map((workout: any, index: number) => (
              <div key={workout.id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-foreground font-medium">{workout.name}</p>
                    <p className="text-caption text-muted-foreground">{workout.exercises?.length || 0} exercícios</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleEditWorkout(workout)} className="text-foreground border-border">
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDeleteWorkout(workout.id)} className="text-foreground border-border hover:text-critical hover:border-critical">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center py-4">
        <Button 
          onClick={() => setShowWorkoutModal(true)}
          className="btn-branded w-full h-12"
        >
          Adicionar treino
        </Button>
      </div>

      <Card className="bg-card border-border p-4">
        <h4 className="text-foreground font-semibold mb-2">Observações</h4>
        <p className="text-caption text-muted-foreground mb-4">Adicione observações gerais sobre o plano de treino</p>
        
        <Textarea
          value={currentPlan?.notes || ''}
          onChange={(e) => updateCurrentPlan({ notes: e.target.value })}
          className="bg-background border-input text-foreground"
          placeholder="Procure sempre manter a forma correta durante os exercícios."
          rows={4}
        />
        <div className="flex justify-end mt-1">
          <span className="text-caption text-muted-foreground">{(currentPlan?.notes || '').length}/500</span>
        </div>
      </Card>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={() => setCurrentView('initial')}>
          Cancelar
        </Button>
        <Button onClick={handleSavePlan} className="btn-branded">
          {editingPlan ? 'Atualizar Plano' : 'Salvar Plano'}
        </Button>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'create':
      case 'edit':
        return renderCreateView();
      default:
        return renderInitialView();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {currentView === 'initial' ? 'Plano de Treino' : 
               currentView === 'edit' ? 'Editar Plano' : 'Criar Plano'}
            </DialogTitle>
          </DialogHeader>
          {renderCurrentView()}
        </DialogContent>
      </Dialog>

      <WorkoutModal
        isOpen={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        onSave={addWorkoutToPlan}
      />

      {selectedWorkout && (
        <WorkoutDetailModal
          isOpen={showWorkoutDetailModal}
          onClose={() => setShowWorkoutDetailModal(false)}
          workout={selectedWorkout}
          onSave={handleSaveWorkout}
        />
      )}

      <WorkoutSelectionModal
        isOpen={showWorkoutSelectionModal}
        onClose={() => setShowWorkoutSelectionModal(false)}
        onSelectWorkout={addWorkoutToPlan}
      />

      <WorkoutLibraryModal
        isOpen={showWorkoutLibraryModal}
        onClose={() => setShowWorkoutLibraryModal(false)}
        onUseTemplate={handleUseTemplate}
      />
    </>
  );
}