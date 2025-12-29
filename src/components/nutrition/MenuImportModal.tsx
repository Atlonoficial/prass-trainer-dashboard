import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMenuImport } from '@/hooks/useMenuImport';
import { Meal } from '@/services/mealPlansService';
import { Utensils, Clock, Info, ChevronRight } from 'lucide-react';

interface MenuImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (meals: Meal[]) => void;
}

export const MenuImportModal: React.FC<MenuImportModalProps> = ({
  open,
  onClose,
  onImport
}) => {
  const { menus, loading, convertMenuToMeals } = useMenuImport();
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [previewMeals, setPreviewMeals] = useState<Meal[] | null>(null);

  const handleSelectMenu = (menu: any) => {
    setSelectedMenuId(menu.id);
    const meals = convertMenuToMeals(menu.extracted_text);
    setPreviewMeals(meals);
  };

  const handleConfirmImport = () => {
    if (previewMeals) {
      onImport(previewMeals);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedMenuId(null);
    setPreviewMeals(null);
    onClose();
  };

  const calculateMealTotals = (meal: Meal) => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    meal.foods.forEach(food => {
      const multiplier = food.quantity / 100;
      calories += (food.calories || 0) * multiplier;
      protein += (food.protein || 0) * multiplier;
      carbs += (food.carbs || 0) * multiplier;
      fat += (food.fat || 0) * multiplier;
    });

    return { calories, protein, carbs, fat };
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Cardápio da Biblioteca</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* Lista de Cardápios */}
          <div className="flex flex-col">
            <h3 className="text-sm font-medium mb-3">Cardápios Disponíveis</h3>
            <ScrollArea className="flex-1 border rounded-md">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Carregando cardápios...
                </div>
              ) : menus.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Utensils className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum cardápio disponível</p>
                  <p className="text-xs mt-1">Crie cardápios na Biblioteca de Cardápios</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {menus.map(menu => (
                    <Card
                      key={menu.id}
                      className={`cursor-pointer transition-colors hover:bg-accent ${
                        selectedMenuId === menu.id ? 'border-primary bg-accent' : ''
                      }`}
                      onClick={() => handleSelectMenu(menu)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{menu.name}</h4>
                            {menu.description && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {menu.description}
                              </p>
                            )}
                            {menu.folder_name && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                {menu.folder_name}
                              </Badge>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Preview do Cardápio */}
          <div className="flex flex-col">
            <h3 className="text-sm font-medium mb-3">Preview</h3>
            <ScrollArea className="flex-1 border rounded-md">
              {!previewMeals ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Selecione um cardápio para visualizar</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {previewMeals.map((meal, index) => {
                    const totals = calculateMealTotals(meal);
                    return (
                      <Card key={meal.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">
                              {meal.name || `Refeição ${index + 1}`}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {meal.time}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {/* Alimentos */}
                          <div className="space-y-1">
                            {meal.foods.map((food, foodIndex) => (
                              <div
                                key={food.id}
                                className="flex items-center justify-between text-xs py-1"
                              >
                                <span className="text-muted-foreground">
                                  {food.name} ({food.quantity}{food.unit})
                                </span>
                                <span className="font-medium">
                                  {Math.round((food.calories || 0) * (food.quantity / 100))} kcal
                                </span>
                              </div>
                            ))}
                          </div>

                          <Separator />

                          {/* Totais da refeição */}
                          <div className="grid grid-cols-4 gap-2 text-center pt-1">
                            <div>
                              <div className="text-xs font-semibold">
                                {Math.round(totals.calories)}
                              </div>
                              <div className="text-xs text-muted-foreground">kcal</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold">
                                {Math.round(totals.protein)}g
                              </div>
                              <div className="text-xs text-muted-foreground">Prot</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold">
                                {Math.round(totals.carbs)}g
                              </div>
                              <div className="text-xs text-muted-foreground">Carb</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold">
                                {Math.round(totals.fat)}g
                              </div>
                              <div className="text-xs text-muted-foreground">Gord</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmImport}
            disabled={!previewMeals || previewMeals.length === 0}
          >
            Importar Cardápio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
