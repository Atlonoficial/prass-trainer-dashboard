import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Clock, Utensils } from 'lucide-react'
import { MealPlan } from '@/services/mealPlansService'

interface DietPlanDetailsModalProps {
  plan: MealPlan | null
  isOpen: boolean
  onClose: () => void
}

export function DietPlanDetailsModal({ plan, isOpen, onClose }: DietPlanDetailsModalProps) {
  if (!plan) return null

  // Cast meals_data para o tipo correto
  const mealsData = Array.isArray(plan.meals_data) ? plan.meals_data as any[] : []

  const totalCalories = mealsData.reduce((total, meal) => 
    total + (Array.isArray(meal.foods) ? meal.foods.reduce((mealTotal: number, food: any) => mealTotal + (food.calories || 0), 0) : 0), 0
  )

  const totalFoods = mealsData.reduce((total, meal) => total + (Array.isArray(meal.foods) ? meal.foods.length : 0), 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Plano: {plan.name}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Plan Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{totalCalories}</div>
              <div className="text-sm text-muted-foreground">Calorias/dia</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{mealsData.length}</div>
              <div className="text-sm text-muted-foreground">Refeições</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-info">{totalFoods}</div>
              <div className="text-sm text-muted-foreground">Alimentos</div>
            </Card>
          </div>

          {/* Plan Description */}
          {plan.description && (
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Descrição do Plano</h4>
              <p className="text-muted-foreground">{plan.description}</p>
            </Card>
          )}

          {/* Meals Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Refeições Detalhadas
            </h3>
            {mealsData.length > 0 ? mealsData.map((meal: any, index: number) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{meal.name || `Refeição ${index + 1}`}</h4>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {meal.time || 'Não especificado'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary">
                      {Array.isArray(meal.foods) ? meal.foods.reduce((total: number, food: any) => total + (food.calories || 0), 0) : 0} kcal
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Array.isArray(meal.foods) ? meal.foods.length : 0} alimento(s)
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {Array.isArray(meal.foods) && meal.foods.length > 0 ? meal.foods.map((food: any, foodIndex: number) => (
                    <div key={foodIndex} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <span className="font-medium">{food.name || 'Alimento'}</span>
                        <div className="text-sm text-muted-foreground">
                          Quantidade: {food.quantity || 'Não especificado'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{food.calories || 0} kcal</div>
                        {(food.protein || food.carbs || food.fat) && (
                          <div className="text-xs text-muted-foreground">
                            P: {food.protein || 0}g | C: {food.carbs || 0}g | G: {food.fat || 0}g
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Nenhum alimento adicionado nesta refeição
                    </div>
                  )}
                </div>
              </Card>
            )) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma refeição cadastrada neste plano
              </div>
            )}
          </div>

          {/* Plan Metadata */}
          <Card className="p-4">
            <h4 className="font-semibold mb-2">Informações do Plano</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Criado em:</span>
                <div>{plan.created_at ? new Date(plan.created_at).toLocaleDateString('pt-BR') : 'N/A'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Última atualização:</span>
                <div>{plan.updated_at ? new Date(plan.updated_at).toLocaleDateString('pt-BR') : 'N/A'}</div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}