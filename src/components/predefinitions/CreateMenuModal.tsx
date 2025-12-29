import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMeals } from '@/hooks/useMeals';
import { Search, Plus, X, UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: string[];
  onSave: (menuData: any) => Promise<any>;
  editingMenu?: any | null;
}

interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealSection {
  type: string;
  name: string;
  foods: FoodItem[];
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Café da Manhã' },
  { value: 'morning_snack', label: 'Lanche da Manhã' },
  { value: 'lunch', label: 'Almoço' },
  { value: 'afternoon_snack', label: 'Lanche da Tarde' },
  { value: 'dinner', label: 'Jantar' },
  { value: 'supper', label: 'Ceia' },
];

export function CreateMenuModal({ isOpen, onClose, folders, onSave, editingMenu }: CreateMenuModalProps) {
  const [menuName, setMenuName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [meals, setMeals] = useState<MealSection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [quantity, setQuantity] = useState('100');
  const [saving, setSaving] = useState(false);
  
  const { meals: availableFoods, loading } = useMeals();
  const { toast } = useToast();

  // Pre-populate data when editing
  useEffect(() => {
    if (editingMenu && isOpen) {
      setMenuName(editingMenu.name || '');
      setDescription(editingMenu.description || '');
      setSelectedFolder(editingMenu.folder_name || '');
      
      // Parse meals data if available
      if (editingMenu.meals_data) {
        try {
          const mealsData = typeof editingMenu.meals_data === 'string' 
            ? JSON.parse(editingMenu.meals_data) 
            : editingMenu.meals_data;
          
          if (Array.isArray(mealsData)) {
            setMeals(mealsData);
          }
        } catch (error) {
          console.error('Error parsing meals data:', error);
        }
      }
    } else if (!isOpen) {
      // Reset form when modal closes
      setMenuName('');
      setDescription('');
      setSelectedFolder('');
      setMeals([]);
      setSearchTerm('');
      setSelectedMealType('breakfast');
      setQuantity('100');
    }
  }, [editingMenu, isOpen]);

  const filteredFoods = useMemo(() => {
    return availableFoods.filter(food => 
      food.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableFoods, searchTerm]);

  const currentMealSection = useMemo(() => {
    return meals.find(m => m.type === selectedMealType);
  }, [meals, selectedMealType]);

  const totals = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    
    meals.forEach(meal => {
      meal.foods.forEach(food => {
        const multiplier = food.quantity / 100;
        calories += food.calories * multiplier;
        protein += food.protein * multiplier;
        carbs += food.carbs * multiplier;
        fat += food.fat * multiplier;
      });
    });

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    };
  }, [meals]);

  const addFoodToMeal = (food: any) => {
    const qty = parseFloat(quantity) || 100;
    const multiplier = qty / 100;

    const newFood: FoodItem = {
      id: food.id,
      name: food.name,
      quantity: qty,
      unit: 'g',
      calories: food.calories * multiplier,
      protein: food.protein * multiplier,
      carbs: food.carbs * multiplier,
      fat: food.fat * multiplier,
    };

    const mealTypeLabel = MEAL_TYPES.find(m => m.value === selectedMealType)?.label || selectedMealType;

    setMeals(prev => {
      const existing = prev.find(m => m.type === selectedMealType);
      if (existing) {
        return prev.map(m => 
          m.type === selectedMealType 
            ? { ...m, foods: [...m.foods, newFood] }
            : m
        );
      }
      return [...prev, { type: selectedMealType, name: mealTypeLabel, foods: [newFood] }];
    });

    setSearchTerm('');
    setQuantity('100');
    
    toast({
      title: "Alimento adicionado",
      description: `${food.name} adicionado ao ${mealTypeLabel}`,
    });
  };

  const removeFoodFromMeal = (mealType: string, foodId: string) => {
    setMeals(prev => 
      prev.map(m => 
        m.type === mealType 
          ? { ...m, foods: m.foods.filter(f => f.id !== foodId) }
          : m
      ).filter(m => m.foods.length > 0)
    );
  };

  const handleSave = async () => {
    if (!menuName.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para o cardápio",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFolder) {
      toast({
        title: "Erro",
        description: "Selecione uma pasta",
        variant: "destructive",
      });
      return;
    }

    if (meals.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos uma refeição",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: menuName,
        description,
        folderName: selectedFolder,
        meals,
        totals,
      });

      // Reset form
      setMenuName('');
      setDescription('');
      setSelectedFolder('');
      setMeals([]);
      setSearchTerm('');
      setQuantity('100');
      
      onClose();
    } catch (error) {
      console.error('Error saving menu:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 pr-12 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            {editingMenu ? 'Editar Cardápio' : 'Criar Cardápio'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 pt-3">
          <div className="space-y-4">
            {/* Informações básicas */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="menu-name">Nome do Cardápio *</Label>
                <Input
                  id="menu-name"
                  placeholder="Ex: Cardápio Hipertrofia - Semana 1"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição opcional do cardápio"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="folder">Pasta *</Label>
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma pasta" />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((folder) => (
                      <SelectItem key={folder} value={folder}>
                        {folder}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Totais nutricionais */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Totais Nutricionais</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Calorias</div>
                  <div className="text-lg font-semibold">{totals.calories}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Proteínas</div>
                  <div className="text-lg font-semibold">{totals.protein}g</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Carboidratos</div>
                  <div className="text-lg font-semibold">{totals.carbs}g</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gorduras</div>
                  <div className="text-lg font-semibold">{totals.fat}g</div>
                </div>
              </div>
            </div>

            {/* Montagem do cardápio */}
            <div>
              <h3 className="font-semibold mb-3">Montar Cardápio</h3>
              
              <Tabs value={selectedMealType} onValueChange={setSelectedMealType}>
                <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-4">
                  {MEAL_TYPES.map(meal => (
                    <TabsTrigger key={meal.value} value={meal.value} className="text-xs">
                      {meal.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {MEAL_TYPES.map(meal => (
                  <TabsContent key={meal.value} value={meal.value} className="space-y-4">
                    {/* Adicionar alimentos */}
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar alimento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Input
                          type="number"
                          placeholder="Qtd (g)"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-24"
                        />
                      </div>

                      {searchTerm && (
                        <div className="border rounded-lg overflow-hidden bg-card">
                          <div className="max-h-60 overflow-y-auto">
                            {loading ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                Carregando alimentos...
                              </div>
                            ) : filteredFoods.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                Nenhum alimento encontrado
                              </div>
                            ) : (
                              <div className="divide-y divide-border/40">
                                {filteredFoods.map((food) => (
                                  <button
                                    key={food.id}
                                    onClick={() => addFoodToMeal(food)}
                                    className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{food.name}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                          {food.calories}cal • {food.protein}g prot • {food.carbs}g carb • {food.fat}g gord
                                        </div>
                                      </div>
                                      <Plus className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Alimentos adicionados */}
                    {currentMealSection && currentMealSection.foods.length > 0 && (
                      <div className="space-y-2">
                        <Label>Alimentos adicionados:</Label>
                        <div className="space-y-2">
                          {currentMealSection.foods.map((food, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                              <div className="flex-1">
                                <div className="font-medium">{food.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {food.quantity}g • {Math.round(food.calories)}cal • {Math.round(food.protein * 10) / 10}g prot
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFoodFromMeal(meal.value, food.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : editingMenu ? 'Atualizar Cardápio' : 'Salvar Cardápio'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
