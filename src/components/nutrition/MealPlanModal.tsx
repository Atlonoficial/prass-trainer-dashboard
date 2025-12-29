// NUTRITION SYSTEM 2.0 - Modal Component
// Modal para criação/edição de meal plans

import React, { useState, useEffect } from 'react';
import { useMealPlans } from '@/hooks/useMealPlans';
import { useFoods } from '@/hooks/useFoods';
import { MealPlan, MealPlanInsert, Meal, MealFood } from '@/services/mealPlansService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Utensils, Clock, Trash2, Download, Beaker } from 'lucide-react';
import { toast } from 'sonner';
import { MenuImportModal } from './MenuImportModal';
import { FormulaImportModal } from './FormulaImportModal';

interface MealPlanModalProps {
  open: boolean;
  onClose: () => void;
  editingPlan?: MealPlan | null;
  studentUserId?: string;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Café da Manhã', icon: '🌅' },
  { value: 'lunch', label: 'Almoço', icon: '🌞' },
  { value: 'dinner', label: 'Jantar', icon: '🌙' },
  { value: 'snack', label: 'Lanche', icon: '🥨' }
] as const;

export const MealPlanModal: React.FC<MealPlanModalProps> = ({
  open,
  onClose,
  editingPlan,
  studentUserId
}) => {
  const { createMealPlan, updateMealPlan, loading } = useMealPlans();
  const { foods } = useFoods();

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_days: 7,
    meals: [] as Meal[]
  });

  const [activeTab, setActiveTab] = useState('info');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  // Carregar dados para edição
  useEffect(() => {
    if (editingPlan) {
      setFormData({
        name: editingPlan.name,
        description: editingPlan.description || '',
        duration_days: editingPlan.duration_days || 7,
        meals: (editingPlan.meals_data as unknown as Meal[]) || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        duration_days: 7,
        meals: []
      });
    }
  }, [editingPlan, open]);

  // Handlers do formulário
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Adicionar nova refeição
  const addMeal = () => {
    const newMeal: Meal = {
      id: `meal_${Date.now()}`,
      name: '',
      time: '08:00',
      type: 'breakfast',
      foods: []
    };
    
    setFormData(prev => ({
      ...prev,
      meals: [...prev.meals, newMeal]
    }));
  };

  // Remover refeição
  const removeMeal = (mealId: string) => {
    setFormData(prev => ({
      ...prev,
      meals: prev.meals.filter(meal => meal.id !== mealId)
    }));
  };

  // Atualizar refeição
  const updateMeal = (mealId: string, updates: Partial<Meal>) => {
    setFormData(prev => ({
      ...prev,
      meals: prev.meals.map(meal => 
        meal.id === mealId ? { ...meal, ...updates } : meal
      )
    }));
  };

  // Adicionar alimento à refeição
  const addFoodToMeal = (mealId: string) => {
    const newFood: MealFood = {
      id: `food_${Date.now()}`,
      name: '',
      quantity: 100,
      unit: 'g',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };

    updateMeal(mealId, {
      foods: [...(formData.meals.find(m => m.id === mealId)?.foods || []), newFood]
    });
  };

  // Remover alimento da refeição
  const removeFoodFromMeal = (mealId: string, foodId: string) => {
    const meal = formData.meals.find(m => m.id === mealId);
    if (meal) {
      updateMeal(mealId, {
        foods: meal.foods.filter(food => food.id !== foodId)
      });
    }
  };

  // Atualizar alimento na refeição
  const updateFoodInMeal = (mealId: string, foodId: string, updates: Partial<MealFood>) => {
    const meal = formData.meals.find(m => m.id === mealId);
    if (meal) {
      updateMeal(mealId, {
        foods: meal.foods.map(food => 
          food.id === foodId ? { ...food, ...updates } : food
        )
      });
    }
  };

  // Aplicar alimento da biblioteca
  const applyLibraryFood = (mealId: string, foodId: string, libraryFood: any) => {
    updateFoodInMeal(mealId, foodId, {
      name: libraryFood.name,
      calories: libraryFood.calories || 0,
      protein: libraryFood.protein || 0,
      carbs: libraryFood.carbohydrates || 0,
      fat: libraryFood.fat || 0
    });
  };

  // Importar cardápio da biblioteca
  const handleImportMenu = (importedMeals: Meal[]) => {
    setFormData(prev => ({
      ...prev,
      meals: importedMeals
    }));
    setActiveTab('meals');
    toast.success(`${importedMeals.length} refeições importadas com sucesso!`);
  };

  // Importar fórmula como refeição
  const handleImportFormula = (importedMeals: Meal[]) => {
    setFormData(prev => ({
      ...prev,
      meals: [...prev.meals, ...importedMeals]
    }));
    setActiveTab('meals');
  };

  // Salvar plano
  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Nome do plano é obrigatório');
        return;
      }

      if (formData.meals.length === 0) {
        toast.error('Adicione pelo menos uma refeição');
        return;
      }

      const planData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        duration_days: formData.duration_days,
        meals_data: formData.meals as unknown as any,
        assigned_students: studentUserId ? [studentUserId] : [],
        status: 'active' as const
      };

      if (editingPlan) {
        await updateMealPlan(editingPlan.id, planData);
      } else {
        // Não passar created_by - será preenchido automaticamente pela RLS
        await createMealPlan(planData as MealPlanInsert);
      }

      onClose();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  // Calcular totais nutricionais
  const calculateTotals = () => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    formData.meals.forEach(meal => {
      meal.foods.forEach(food => {
        const multiplier = food.quantity / 100; // Assumindo valores por 100g
        totalCalories += (food.calories || 0) * multiplier;
        totalProtein += (food.protein || 0) * multiplier;
        totalCarbs += (food.carbs || 0) * multiplier;
        totalFat += (food.fat || 0) * multiplier;
      });
    });

    return { totalCalories, totalProtein, totalCarbs, totalFat };
  };

  const totals = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingPlan ? 'Editar Plano Alimentar' : 'Novo Plano Alimentar'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="meals">Refeições</TabsTrigger>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Plano *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Digite o nome do plano"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (dias)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={formData.duration_days}
                    onChange={(e) => handleInputChange('duration_days', parseInt(e.target.value) || 7)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descreva o objetivo do plano alimentar..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="meals" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Refeições ({formData.meals.length})</h3>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={() => setShowImportModal(true)} 
                    size="sm" 
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Importar Cardápio
                  </Button>
                  <Button 
                    onClick={() => setShowFormulaModal(true)} 
                    size="sm" 
                    variant="outline"
                  >
                    <Beaker className="h-4 w-4 mr-2" />
                    Adicionar Fórmula
                  </Button>
                  <Button onClick={addMeal} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Refeição
                  </Button>
                </div>
              </div>

              {formData.meals.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="text-center">
                      <Utensils className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhuma refeição adicionada ainda</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {formData.meals.map((meal, mealIndex) => (
                    <Card key={meal.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Refeição {mealIndex + 1}</CardTitle>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeMeal(meal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Informações da refeição */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Nome da Refeição</Label>
                            <Input
                              value={meal.name}
                              onChange={(e) => updateMeal(meal.id, { name: e.target.value })}
                              placeholder="Ex: Café da manhã"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select 
                              value={meal.type} 
                              onValueChange={(value) => updateMeal(meal.id, { type: value as any })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MEAL_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Horário</Label>
                            <Input
                              type="time"
                              value={meal.time}
                              onChange={(e) => updateMeal(meal.id, { time: e.target.value })}
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Alimentos da refeição */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label>Alimentos ({meal.foods.length})</Label>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => addFoodToMeal(meal.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Alimento
                            </Button>
                          </div>

                          {meal.foods.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                              Nenhum alimento adicionado
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {meal.foods.map((food, foodIndex) => (
                                <Card key={food.id} className="p-3">
                                  <div className="grid grid-cols-6 gap-2 items-center">
                                    <div className="col-span-2">
                                      <Select 
                                        value={food.name || ''} 
                                        onValueChange={(value) => {
                                          const libraryFood = foods.find(f => f.name === value);
                                          if (libraryFood) {
                                            applyLibraryFood(meal.id, food.id, libraryFood);
                                          } else {
                                            updateFoodInMeal(meal.id, food.id, { name: value });
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue placeholder="Selecionar alimento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {foods.map(f => (
                                            <SelectItem key={f.id} value={f.name}>
                                              {f.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Input
                                      type="number"
                                      placeholder="Qtd"
                                      value={food.quantity}
                                      onChange={(e) => updateFoodInMeal(meal.id, food.id, { 
                                        quantity: parseFloat(e.target.value) || 0 
                                      })}
                                      className="h-8"
                                    />
                                    <Input
                                      placeholder="Unidade"
                                      value={food.unit}
                                      onChange={(e) => updateFoodInMeal(meal.id, food.id, { unit: e.target.value })}
                                      className="h-8"
                                    />
                                    <Input
                                      type="number"
                                      placeholder="Kcal"
                                      value={food.calories}
                                      onChange={(e) => updateFoodInMeal(meal.id, food.id, { 
                                        calories: parseFloat(e.target.value) || 0 
                                      })}
                                      className="h-8"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeFoodFromMeal(meal.id, food.id)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo Nutricional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {Math.round(totals.totalCalories)}
                      </div>
                      <div className="text-sm text-muted-foreground">Calorias</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(totals.totalProtein)}g
                      </div>
                      <div className="text-sm text-muted-foreground">Proteína</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(totals.totalCarbs)}g
                      </div>
                      <div className="text-sm text-muted-foreground">Carboidratos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {Math.round(totals.totalFat)}g
                      </div>
                      <div className="text-sm text-muted-foreground">Gorduras</div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Detalhes do Plano</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p><strong>Nome:</strong> {formData.name || 'Não definido'}</p>
                      <p><strong>Duração:</strong> {formData.duration_days} dias</p>
                      <p><strong>Total de refeições:</strong> {formData.meals.length}</p>
                      <p><strong>Total de alimentos:</strong> {formData.meals.reduce((acc, meal) => acc + meal.foods.length, 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Salvando...' : editingPlan ? 'Atualizar' : 'Criar Plano'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <MenuImportModal 
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportMenu}
      />

      <FormulaImportModal 
        open={showFormulaModal}
        onClose={() => setShowFormulaModal(false)}
        onImport={handleImportFormula}
      />
    </Dialog>
  );
};