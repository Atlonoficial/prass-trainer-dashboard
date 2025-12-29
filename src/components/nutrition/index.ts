// NUTRITION SYSTEM 2.0 - Exports
export { MealPlansManager } from './MealPlansManager';
export { MealPlanModal } from './MealPlanModal';

// Re-export types for convenience
export type { 
  MealPlan, 
  MealPlanInsert, 
  MealPlanUpdate, 
  Meal, 
  MealFood 
} from '@/services/mealPlansService';

// Re-export service and hook
export { mealPlansService } from '@/services/mealPlansService';
export { useMealPlans } from '@/hooks/useMealPlans';