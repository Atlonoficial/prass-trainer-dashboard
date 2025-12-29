import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Utensils, Flame, Drumstick, Wheat, Droplet } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  file_type: string;
  extracted_text: string | null;
}

interface Food {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  name: string;
  time: string;
  foods: Food[];
}

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ViewMenuModalProps {
  open: boolean;
  onClose: () => void;
  menu: MenuItem | null;
}

export function ViewMenuModal({ open, onClose, menu }: ViewMenuModalProps) {
  if (!menu) return null;

  // Parse extracted_text to get meals and totals
  let meals: Meal[] = [];
  let totals: Totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  try {
    if (menu.extracted_text) {
      const data = JSON.parse(menu.extracted_text);
      meals = data.meals || [];
      totals = data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
  } catch (error) {
    console.error('Error parsing menu data:', error);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="text-2xl">{menu.name}</DialogTitle>
          {menu.description && (
            <p className="text-sm text-muted-foreground mt-2">{menu.description}</p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-5 pb-5 pt-3">
          <div className="space-y-6">
            {/* Totals Summary Card */}
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Totais Nutricionais Diários</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Flame className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Calorias</p>
                    <p className="text-sm font-semibold">{Math.round(totals.calories)} kcal</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Drumstick className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Proteínas</p>
                    <p className="text-sm font-semibold">{Math.round(totals.protein)}g</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Wheat className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Carboidratos</p>
                    <p className="text-sm font-semibold">{Math.round(totals.carbs)}g</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    <Droplet className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gorduras</p>
                    <p className="text-sm font-semibold">{Math.round(totals.fat)}g</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Meals List */}
            {meals.length === 0 ? (
              <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-8 text-center">
                <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">Nenhuma refeição cadastrada neste cardápio</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {meals.map((meal, index) => (
                  <Card key={index} className="border-border/40 bg-card/50 backdrop-blur-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">{meal.name}</h3>
                      </div>
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {meal.time}
                      </Badge>
                    </div>

                    {meal.foods && meal.foods.length > 0 ? (
                      <div className="space-y-2">
                        {meal.foods.map((food, foodIndex) => (
                          <div
                            key={foodIndex}
                            className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/20"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{food.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {food.quantity} {food.unit}
                              </p>
                            </div>
                            <div className="flex gap-3 text-xs">
                              <div className="text-center">
                                <p className="text-muted-foreground">Cal</p>
                                <p className="font-semibold text-orange-500">{Math.round(food.calories)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground">Ptn</p>
                                <p className="font-semibold text-blue-500">{Math.round(food.protein)}g</p>
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground">Carb</p>
                                <p className="font-semibold text-amber-500">{Math.round(food.carbs)}g</p>
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground">Gord</p>
                                <p className="font-semibold text-yellow-500">{Math.round(food.fat)}g</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Nenhum alimento nesta refeição</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
