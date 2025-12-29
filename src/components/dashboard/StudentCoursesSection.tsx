import StudentCoursesTab from '@/components/courses/StudentCoursesTab';

export default function StudentCoursesSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Cursos Disponíveis</h1>
      </div>
      
      <StudentCoursesTab />
    </div>
  );
}