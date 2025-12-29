import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Save, X, Calendar, ChefHat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Food {
  name: string;
  quantity: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

interface Meal {
  name: string;
  time: string;
  foods: Food[];
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  instructions?: string;
  substitutions?: string;
}

interface DayPlan {
  day: string;
  meals: Meal[];
  daily_totals: {
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
  };
}

interface WeeklyDietPlan {
  name: string;
  description: string;
  duration_weeks: number;
  days: DayPlan[];
  safety_considerations?: string;
  generation_context?: any;
}

interface EditAIDietModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: any;
  onSave: (updatedPlan: any) => void;
}

export function EditAIDietModal({ isOpen, onClose, plan, onSave }: EditAIDietModalProps) {
  const [currentDay, setCurrentDay] = useState(0);
  const { toast } = useToast();

  // Detectar se é plano semanal ou linear
  const isWeeklyPlan = plan?.days && Array.isArray(plan.days);
  
  // Estado unificado - sempre trabalha com estrutura semanal
  const [editedPlan, setEditedPlan] = useState<WeeklyDietPlan>(() => {
    if (isWeeklyPlan) {
      return plan;
    } else {
      // Converter plano linear para semanal
      return {
        name: plan?.name || 'Plano Alimentar',
        description: plan?.description || '',
        duration_weeks: 1,
        days: [{
          day: 'Segunda-feira',
          meals: plan?.meals || [],
          daily_totals: {
            calories: plan?.meals?.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0) || 0,
            proteins: plan?.meals?.reduce((sum: number, meal: any) => sum + (meal.proteins || meal.protein || 0), 0) || 0,
            carbs: plan?.meals?.reduce((sum: number, meal: any) => sum + (meal.carbs || 0), 0) || 0,
            fats: plan?.meals?.reduce((sum: number, meal: any) => sum + (meal.fats || meal.fat || 0), 0) || 0,
          }
        }],
        safety_considerations: plan?.safety_considerations,
        generation_context: plan?.generation_context
      };
    }
  });

  // Calcular totais semanais
  const weeklyTotals = useMemo(() => {
    return editedPlan.days.reduce((totals, day) => ({
      calories: totals.calories + (day.daily_totals?.calories || 0),
      proteins: totals.proteins + (day.daily_totals?.proteins || 0),
      carbs: totals.carbs + (day.daily_totals?.carbs || 0),
      fats: totals.fats + (day.daily_totals?.fats || 0),
    }), { calories: 0, proteins: 0, carbs: 0, fats: 0 });
  }, [editedPlan.days]);

  const handleSave = () => {
    // Recalcular totais antes de salvar
    const updatedPlan = {
      ...editedPlan,
      days: editedPlan.days.map(day => ({
        ...day,
        daily_totals: {
          calories: day.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0),
          proteins: day.meals.reduce((sum, meal) => sum + (meal.proteins || 0), 0),
          carbs: day.meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
          fats: day.meals.reduce((sum, meal) => sum + (meal.fats || 0), 0),
        }
      }))
    };
    
    onSave(updatedPlan);
    toast({
      title: "Sucesso",
      description: "Plano alimentar editado com sucesso!",
    });
    onClose();
  };

  const updateMeal = (dayIndex: number, mealIndex: number, field: string, value: any) => {
    setEditedPlan(prev => {
      const newDays = [...prev.days];
      const newMeals = [...newDays[dayIndex].meals];
      newMeals[mealIndex] = { ...newMeals[mealIndex], [field]: value };
      newDays[dayIndex] = { ...newDays[dayIndex], meals: newMeals };
      return { ...prev, days: newDays };
    });
  };

  const removeMeal = (dayIndex: number, mealIndex: number) => {
    setEditedPlan(prev => {
      const newDays = [...prev.days];
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        meals: newDays[dayIndex].meals.filter((_, i) => i !== mealIndex)
      };
      return { ...prev, days: newDays };
    });
  };

  const addMeal = (dayIndex: number) => {
    const newMeal: Meal = {
      name: 'Nova Refeição',
      time: '12:00',
      foods: [],
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
      instructions: '',
      substitutions: ''
    };
    
    setEditedPlan(prev => {
      const newDays = [...prev.days];
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        meals: [...newDays[dayIndex].meals, newMeal]
      };
      return { ...prev, days: newDays };
    });
  };

  const updateFoods = (dayIndex: number, mealIndex: number, foodsText: string) => {
    const foodsArray = foodsText.split(',').map(food => food.trim()).filter(food => food).map(food => ({
      name: food,
      quantity: '1 porção',
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0
    }));
    updateMeal(dayIndex, mealIndex, 'foods', foodsArray);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Editar Plano Alimentar</span>
            {plan?.generation_context?.useAnamnesis && (
              <Badge variant="secondary">Baseado na Anamnese</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="planName">Nome do Plano</Label>
              <Input
                id="planName"
                value={editedPlan.name}
                onChange={(e) => setEditedPlan({ ...editedPlan, name: e.target.value })}
                placeholder="Nome do plano alimentar"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duração (semanas)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={editedPlan.duration_weeks}
                onChange={(e) => setEditedPlan({ ...editedPlan, duration_weeks: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={editedPlan.description}
              onChange={(e) => setEditedPlan({ ...editedPlan, description: e.target.value })}
              placeholder="Descrição do plano alimentar"
              rows={3}
            />
          </div>

          {/* Resumo Semanal */}
          <Card className="p-4 bg-muted/50">
            <h4 className="font-medium mb-2 flex items-center">
              <ChefHat className="w-4 h-4 mr-2" />
              Totais Semanais
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Calorias:</span>
                <div className="font-medium">{weeklyTotals.calories.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Proteínas:</span>
                <div className="font-medium">{weeklyTotals.proteins.toFixed(1)}g</div>
              </div>
              <div>
                <span className="text-muted-foreground">Carboidratos:</span>
                <div className="font-medium">{weeklyTotals.carbs.toFixed(1)}g</div>
              </div>
              <div>
                <span className="text-muted-foreground">Gorduras:</span>
                <div className="font-medium">{weeklyTotals.fats.toFixed(1)}g</div>
              </div>
            </div>
          </Card>

          {/* Planejamento Semanal */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Planejamento Semanal
            </h3>
            
            <Tabs value={currentDay.toString()} onValueChange={(value) => setCurrentDay(parseInt(value))}>
              <TabsList className="grid w-full grid-cols-7">
                {editedPlan.days.map((day, index) => (
                  <TabsTrigger key={index} value={index.toString()} className="text-xs">
                    {day.day.substring(0, 3)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {editedPlan.days.map((day, dayIndex) => (
                <TabsContent key={dayIndex} value={dayIndex.toString()} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-lg">{day.day}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {day.daily_totals?.calories || 0} kcal
                      </Badge>
                      <Button onClick={() => addMeal(dayIndex)} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar Refeição
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground">Calorias</div>
                      <div className="font-semibold">{day.daily_totals?.calories || 0}</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground">Proteínas</div>
                      <div className="font-semibold">{day.daily_totals?.proteins?.toFixed(1) || 0}g</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground">Carboidratos</div>
                      <div className="font-semibold">{day.daily_totals?.carbs?.toFixed(1) || 0}g</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground">Gorduras</div>
                      <div className="font-semibold">{day.daily_totals?.fats?.toFixed(1) || 0}g</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {day.meals.map((meal, mealIndex) => (
                      <Card key={mealIndex} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <Label>Nome da Refeição</Label>
                            <Input
                              value={meal.name}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'name', e.target.value)}
                              placeholder="Ex: Café da manhã"
                            />
                          </div>
                          
                          <div>
                            <Label>Horário</Label>
                            <Input
                              type="time"
                              value={meal.time}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'time', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label>Calorias</Label>
                            <Input
                              type="number"
                              value={meal.calories}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'calories', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          
                          <div>
                            <Label>Proteínas (g)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={meal.proteins}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'proteins', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          
                          <div>
                            <Label>Carboidratos (g)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={meal.carbs}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'carbs', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          
                          <div>
                            <Label>Gorduras (g)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={meal.fats}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'fats', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          
                          <div className="md:col-span-2 lg:col-span-3">
                            <Label>Alimentos (separados por vírgula)</Label>
                            <Textarea
                              value={Array.isArray(meal.foods) ? meal.foods.map(f => typeof f === 'string' ? f : f.name).join(', ') : ''}
                              onChange={(e) => updateFoods(dayIndex, mealIndex, e.target.value)}
                              placeholder="Ex: 2 fatias de pão integral, 1 ovo mexido, 1 copo de leite"
                              rows={2}
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <Label>Instruções de Preparo</Label>
                            <Textarea
                              value={meal.instructions || ''}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'instructions', e.target.value)}
                              placeholder="Como preparar a refeição"
                              rows={2}
                            />
                          </div>
                          
                          <div className="md:col-span-1">
                            <Label>Substituições</Label>
                            <Textarea
                              value={meal.substitutions || ''}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'substitutions', e.target.value)}
                              placeholder="Opções de substituição"
                              rows={2}
                            />
                          </div>
                          
                          <div className="flex items-end justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeMeal(dayIndex, mealIndex)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Observações Médicas */}
          {editedPlan?.generation_context?.useAnamnesis && (
            <div>
              <Label htmlFor="safetyConsiderations">Considerações Dietéticas</Label>
              <Textarea
                id="safetyConsiderations"
                value={editedPlan.safety_considerations || ''}
                onChange={(e) => setEditedPlan({ ...editedPlan, safety_considerations: e.target.value })}
                placeholder="Considerações médicas e dietéticas baseadas na anamnese"
                rows={3}
              />
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}