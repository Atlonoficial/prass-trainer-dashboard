import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNutritionFormulas } from '@/hooks/useNutritionFormulas';
import { NutritionFormula } from '@/hooks/useNutritionFormulas';
import { Meal, MealFood } from '@/services/mealPlansService';
import { Beaker, Check, Search } from 'lucide-react';
import { toast } from 'sonner';

interface FormulaImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (meals: Meal[]) => void;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Café da Manhã', icon: '🌅' },
  { value: 'lunch', label: 'Almoço', icon: '🌞' },
  { value: 'dinner', label: 'Jantar', icon: '🌙' },
  { value: 'snack', label: 'Lanche', icon: '🥨' }
] as const;

export const FormulaImportModal: React.FC<FormulaImportModalProps> = ({
  open,
  onClose,
  onImport
}) => {
  const { formulas, loading } = useNutritionFormulas();
  const [selectedFormula, setSelectedFormula] = useState<NutritionFormula | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mealType, setMealType] = useState<string>('snack');
  const [mealTime, setMealTime] = useState('12:00');

  const filteredFormulas = formulas.filter(formula =>
    formula.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formula.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectFormula = (formula: NutritionFormula) => {
    setSelectedFormula(formula);
  };

  const handleImport = () => {
    if (!selectedFormula) {
      toast.error('Selecione uma fórmula para importar');
      return;
    }

    // Converter fórmula em refeição com seus ingredientes como alimentos
    const foods: MealFood[] = selectedFormula.ingredients.map((ingredient, index) => {
      // Calcular macros proporcionais se disponíveis
      const ingredientCount = selectedFormula.ingredients.length;
      const proportionalCalories = Math.round((selectedFormula.total_calories || 0) / ingredientCount);
      const proportionalProtein = Math.round((selectedFormula.total_protein || 0) / ingredientCount);
      const proportionalCarbs = Math.round((selectedFormula.total_carbs || 0) / ingredientCount);
      const proportionalFat = Math.round((selectedFormula.total_fat || 0) / ingredientCount);

      return {
        id: `food_${Date.now()}_${index}`,
        name: ingredient.name,
        quantity: parseFloat(ingredient.quantity) || 100,
        unit: ingredient.unit || 'g',
        calories: proportionalCalories,
        protein: proportionalProtein,
        carbs: proportionalCarbs,
        fat: proportionalFat
      };
    });

    const newMeal: Meal = {
      id: `meal_${Date.now()}`,
      name: selectedFormula.name,
      type: mealType as any,
      time: mealTime,
      foods
    };

    onImport([newMeal]);
    toast.success(`Fórmula "${selectedFormula.name}" importada com sucesso!`);
    onClose();
    
    // Reset
    setSelectedFormula(null);
    setSearchTerm('');
    setMealType('snack');
    setMealTime('12:00');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Importar Fórmula
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Filtro de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fórmulas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
            {/* Lista de fórmulas */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fórmulas Disponíveis ({filteredFormulas.length})</Label>
              <ScrollArea className="h-[400px] border rounded-md">
                <div className="p-2 space-y-2">
                  {loading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                  ) : filteredFormulas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchTerm ? 'Nenhuma fórmula encontrada' : 'Nenhuma fórmula cadastrada'}
                    </p>
                  ) : (
                    filteredFormulas.map((formula) => (
                      <Card
                        key={formula.id}
                        className={`cursor-pointer transition-colors hover:bg-accent ${
                          selectedFormula?.id === formula.id ? 'border-primary bg-accent' : ''
                        }`}
                        onClick={() => handleSelectFormula(formula)}
                      >
                        <CardHeader className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm font-medium truncate">
                                {formula.name}
                              </CardTitle>
                              {formula.category && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {formula.category}
                                </Badge>
                              )}
                            </div>
                            {selectedFormula?.id === formula.id && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                          {formula.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {formula.description}
                            </p>
                          )}
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Preview da fórmula selecionada */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preview da Fórmula</Label>
              <ScrollArea className="h-[400px] border rounded-md">
                {selectedFormula ? (
                  <div className="p-4 space-y-4">
                    <div>
                      <h3 className="font-semibold text-base mb-1">{selectedFormula.name}</h3>
                      {selectedFormula.category && (
                        <Badge variant="outline" className="mb-2">{selectedFormula.category}</Badge>
                      )}
                      {selectedFormula.description && (
                        <p className="text-sm text-muted-foreground">{selectedFormula.description}</p>
                      )}
                    </div>

                    {/* Valores nutricionais totais */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted p-2 rounded">
                        <p className="text-xs text-muted-foreground">Calorias</p>
                        <p className="font-semibold">{selectedFormula.total_calories || 0} kcal</p>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-xs text-muted-foreground">Proteínas</p>
                        <p className="font-semibold">{selectedFormula.total_protein || 0}g</p>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-xs text-muted-foreground">Carboidratos</p>
                        <p className="font-semibold">{selectedFormula.total_carbs || 0}g</p>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-xs text-muted-foreground">Gorduras</p>
                        <p className="font-semibold">{selectedFormula.total_fat || 0}g</p>
                      </div>
                    </div>

                    {/* Ingredientes */}
                    <div>
                      <Label className="text-sm">Ingredientes ({selectedFormula.ingredients.length})</Label>
                      <div className="space-y-1 mt-2">
                        {selectedFormula.ingredients.map((ingredient, index) => (
                          <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                            <span className="font-medium">{ingredient.name}</span>
                            {ingredient.quantity && ingredient.unit && (
                              <span className="text-muted-foreground ml-2">
                                - {ingredient.quantity} {ingredient.unit}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Configurações da refeição */}
                    <div className="space-y-3 pt-3 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="mealType">Tipo de Refeição</Label>
                        <Select value={mealType} onValueChange={setMealType}>
                          <SelectTrigger id="mealType">
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
                        <Label htmlFor="mealTime">Horário</Label>
                        <Input
                          id="mealTime"
                          type="time"
                          value={mealTime}
                          onChange={(e) => setMealTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground p-4">
                    <div className="text-center">
                      <Beaker className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Selecione uma fórmula para visualizar</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!selectedFormula}>
              <Beaker className="h-4 w-4 mr-2" />
              Importar Fórmula
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
