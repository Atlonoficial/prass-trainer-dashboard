// NUTRITION SYSTEM 2.0 - Exports principais
export { MealPlansManager } from '@/components/nutrition';
export { MealPlanModal } from '@/components/nutrition';

// Componente de detalhes - mantido para compatibilidade
export { DietPlanDetailsModal } from './DietPlanDetailsModal';

// Hook e tipos principais - NUTRITION SYSTEM 2.0
export { useMealPlans } from '@/hooks/useMealPlans';
export type { MealPlan, MealPlanInsert, MealPlanUpdate, Meal, MealFood } from '@/services/mealPlansService';