import CoursesTab from '@/components/courses/CoursesTab';

export default function ProductsCoursesSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Cursos e Mentorias</h1>
      </div>

      <CoursesTab />
    </div>
  );
}
