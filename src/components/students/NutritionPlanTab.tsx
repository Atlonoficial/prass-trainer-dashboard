import { MealPlansManager } from '@/components/nutrition';

interface NutritionPlanTabProps {
  studentUserId: string
  studentName: string
}

export function NutritionPlanTab({ studentUserId, studentName }: NutritionPlanTabProps) {
  return (
    <div className="p-6">
      <MealPlansManager 
        studentUserId={studentUserId}
        studentName={studentName}
        isStudentView={false}
      />
    </div>
  );
}