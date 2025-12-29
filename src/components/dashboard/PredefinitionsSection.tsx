import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Apple,
  Calculator,
  Utensils,
  Dumbbell,
  Zap,
  Activity,
  Plus,
  Edit,
  Trash2,
  FileText,
  BookCopy,
  ListOrdered
} from 'lucide-react';
import MyFoodsModal from '@/components/predefinitions/MyFoodsModal';
import MyFormulasModal from '@/components/predefinitions/MyFormulasModal';
import { MenuLibraryModal } from '@/components/predefinitions/MenuLibraryModal';
import MyExercisesModal from '@/components/predefinitions/MyExercisesModal';
import AdvancedTechniquesModal from '@/components/predefinitions/AdvancedTechniquesModal';
import WorkoutLibraryModal from '@/components/predefinitions/WorkoutLibraryModal';
import AddFoodModal from '@/components/predefinitions/AddFoodModal';
import AddFormulaModal from '@/components/predefinitions/AddFormulaModal';
import AddExerciseModal from '@/components/predefinitions/AddExerciseModal';
import { useRecentItems } from '@/hooks/useRecentItems';
import { useMeals } from '@/hooks/useMeals';
import { useExercises } from '@/hooks/useExercises';
import { useFormulas } from '@/hooks/useFormulas';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function PredefinitionsSection() {
  const [activeCategory, setActiveCategory] = useState<'dieta' | 'treinamento'>('dieta');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Hook calls
  const handleUseRecentItem = (item: any) => {
    switch (item.category) {
      case 'Alimento':
        setActiveModal('myFoods')
        break
      case 'Fórmula':
        setActiveModal('myFormulas')
        break
      case 'Cardápio':
        setActiveModal('menuLibrary')
        break
      case 'Plano Nutricional':
        setActiveModal('myFoods') // Or appropriate modal
        break
      case 'Exercício':
        setActiveModal('myExercises')
        break
      case 'Técnica':
        setActiveModal('advancedTechniques')
        break
      case 'Treino':
        setActiveModal('workoutLibrary')
        break
      default:
        toast({ 
          title: 'Item selecionado', 
          description: `${item.name} foi selecionado`,
          duration: 2000
        })
    }
  }

  const { recentItems, loading: loadingRecent, useItem, addRecentItem } = useRecentItems();
  const { addMeal } = useMeals();
  const { addExercise } = useExercises();
  const { addFormula } = useFormulas();

  const dietItems = [
    { id: 1, name: 'Meus alimentos', icon: Apple, description: 'Lista personalizada de alimentos' },
    { id: 2, name: 'Minhas fórmulas', icon: Calculator, description: 'Fórmulas nutricionais salvas' },
    { id: 3, name: 'Meus cardápios', icon: Utensils, description: 'Cardápios pré-definidos' }
  ];

  const trainingItems = [
    { id: 1, name: 'Meus exercícios', icon: Dumbbell, description: 'Banco de exercícios personalizado' },
    { id: 2, name: 'Técnicas avançadas', icon: Zap, description: 'Técnicas de treinamento avançadas' },
    { id: 3, name: 'Meus treinos', icon: Activity, description: 'Treinos pré-configurados' }
  ];

  const currentItems = activeCategory === 'dieta' ? dietItems : trainingItems;

  const handleAccessClick = (itemName: string) => {
    if (activeCategory === 'dieta') {
      switch (itemName) {
        case 'Meus alimentos':
          setActiveModal('myFoods');
          break;
        case 'Minhas fórmulas':
          setActiveModal('myFormulas');
          break;
        case 'Meus cardápios':
          setActiveModal('menuLibrary');
          break;
      }
    } else {
      switch (itemName) {
        case 'Meus exercícios':
          setActiveModal('myExercises');
          break;
        case 'Técnicas avançadas':
          setActiveModal('advancedTechniques');
          break;
        case 'Meus treinos':
          setActiveModal('workoutLibrary');
          break;
      }
    }
  };

  const handleQuickAction = (action: string) => {
    if (activeCategory === 'dieta') {
      switch (action) {
        case 'alimento':
          setActiveModal('addFood');
          break;
        case 'formula':
          setActiveModal('addFormula');
          break;
        case 'cardapio':
          setActiveModal('menuLibrary');
          break;
      }
    } else {
      switch (action) {
        case 'exercicio':
          setActiveModal('addExercise');
          break;
        case 'tecnica':
          setActiveModal('advancedTechniques');
          break;
        case 'treino':
          setActiveModal('workoutLibrary');
          break;
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Predefinições</h1>
          <p className="text-muted-foreground">Configure seus modelos e bibliotecas pessoais</p>
        </div>
      </div>

      {/* Category Selector */}
      <Card className="bg-card border-border p-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:space-x-4 mb-6">
        <Button
          onClick={() => setActiveCategory('treinamento')}
          className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg transition-all flex-1 sm:flex-none ${
            activeCategory === 'treinamento'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span className="hidden sm:inline">Treinamento</span>
          <span className="sm:hidden">Treino</span>
        </Button>
        <Button
          onClick={() => setActiveCategory('dieta')}
          className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg transition-all flex-1 sm:flex-none ${
            activeCategory === 'dieta'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          <Apple className="w-5 h-5" />
          <span className="hidden sm:inline">Dieta e Nutrição</span>
          <span className="sm:hidden">Dieta</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.id}
              className={cn(
                "group relative overflow-hidden",
                "bg-card border border-border/50 rounded-xl",
                "hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10",
                "transition-all duration-300 ease-out",
                "p-6 cursor-pointer"
              )}
              onClick={() => handleAccessClick(item.name)}
            >
              {/* Header com Ícone Centralizado */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-1.5 leading-tight">
                  {item.name}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
              
              {/* Footer com Botões */}
              <div className="relative">
                <Button 
                  size="sm" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccessClick(item.name);
                  }}
                >
                  Acessar
                </Button>
                
                {/* Botão + Circular - Posição Absoluta */}
                <Button 
                  size="icon"
                  variant="ghost" 
                  className="absolute -bottom-3 -right-3 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm border border-border/40 opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickAction(
                      activeCategory === 'dieta' 
                        ? (item.name === 'Meus alimentos' ? 'alimento' : 
                           item.name === 'Minhas fórmulas' ? 'formula' : 'cardapio')
                        : (item.name === 'Meus exercícios' ? 'exercicio' : 
                           item.name === 'Técnicas avançadas' ? 'tecnica' : 'treino')
                    );
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-border">
          <h4 className="text-foreground font-medium mb-4">Ações Rápidas</h4>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button 
              onClick={() => handleQuickAction(activeCategory === 'dieta' ? 'alimento' : 'exercicio')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none min-w-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{activeCategory === 'dieta' ? 'Novo Alimento' : 'Novo Exercício'}</span>
              <span className="sm:hidden">{activeCategory === 'dieta' ? 'Alimento' : 'Exercício'}</span>
            </Button>
            <Button 
              onClick={() => handleQuickAction(activeCategory === 'dieta' ? 'formula' : 'tecnica')}
              variant="outline" 
              className="border-border text-muted-foreground flex-1 sm:flex-none min-w-0"
            >
              <Calculator className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{activeCategory === 'dieta' ? 'Nova Fórmula' : 'Nova Técnica'}</span>
              <span className="sm:hidden">{activeCategory === 'dieta' ? 'Fórmula' : 'Técnica'}</span>
            </Button>
            <Button 
              onClick={() => handleQuickAction(activeCategory === 'dieta' ? 'cardapio' : 'treino')}
              variant="outline" 
              className="border-border text-muted-foreground flex-1 sm:flex-none min-w-0"
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{activeCategory === 'dieta' ? 'Novo Cardápio' : 'Novo Treino'}</span>
              <span className="sm:hidden">{activeCategory === 'dieta' ? 'Cardápio' : 'Treino'}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Items */}
      <Card className="bg-card border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Itens Recentes</h3>
        <div className="space-y-3">
          {recentItems
            .filter(item => activeCategory === 'dieta' ? item.type === 'dieta' : item.type === 'treinamento')
            .map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.type === 'dieta' ? 
                      <Apple className="w-4 h-4 text-primary" /> : 
                      <Dumbbell className="w-4 h-4 text-primary" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground font-medium truncate">{item.name}</p>
                    <p className="text-muted-foreground text-sm">{item.category} • {item.lastUsed}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-primary text-primary w-full sm:w-auto"
                  onClick={() => useItem(item, handleUseRecentItem)}
                >
                  Usar
                </Button>
              </div>
            ))}
          {recentItems.filter(item => activeCategory === 'dieta' ? item.type === 'dieta' : item.type === 'treinamento').length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Nenhum item recente disponível
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <MyFoodsModal 
        isOpen={activeModal === 'myFoods'} 
        onClose={() => setActiveModal(null)} 
      />
      <MyFormulasModal 
        isOpen={activeModal === 'myFormulas'} 
        onClose={() => setActiveModal(null)} 
      />
      <MenuLibraryModal 
        isOpen={activeModal === 'menuLibrary'} 
        onClose={() => setActiveModal(null)} 
      />
      <MyExercisesModal 
        isOpen={activeModal === 'myExercises'} 
        onClose={() => setActiveModal(null)} 
      />
      <AdvancedTechniquesModal 
        isOpen={activeModal === 'advancedTechniques'} 
        onClose={() => setActiveModal(null)} 
      />
      <WorkoutLibraryModal 
        isOpen={activeModal === 'workoutLibrary'} 
        onClose={() => setActiveModal(null)} 
      />

      {/* Quick Action Modals */}
      <AddFoodModal 
        isOpen={activeModal === 'addFood'} 
        onClose={() => setActiveModal(null)} 
        onSave={async (mealData) => {
          await addMeal(mealData);
          addRecentItem(mealData.name, 'Alimento', 'dieta', mealData);
          setActiveModal(null);
        }}
      />
      <AddFormulaModal 
        isOpen={activeModal === 'addFormula'} 
        onClose={() => setActiveModal(null)} 
        onSave={async (formulaData) => {
          try {
            await addFormula(formulaData);
            addRecentItem(formulaData.name, 'Fórmula', 'dieta', formulaData);
            setActiveModal(null);
          } catch (error) {
            // Error handled by hook
          }
        }}
      />
      <AddExerciseModal 
        isOpen={activeModal === 'addExercise'} 
        onClose={() => setActiveModal(null)} 
        exercise={null}
        onSave={async (exerciseData) => {
          try {
            await addExercise(exerciseData);
            addRecentItem(exerciseData.name, 'Exercício', 'treinamento', exerciseData);
            setActiveModal(null);
          } catch (error) {
            // Error handled by hook
          }
        }}
      />
    </div>
  );
}