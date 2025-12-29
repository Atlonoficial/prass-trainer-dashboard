import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Play, Users, BookOpen, TrendingUp } from 'lucide-react';
import { useCourses, Course } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import CourseForm from './CourseForm';
import CourseCard from './CourseCard';

export default function CoursesTab() {
  const { courses, loading, addCourse, updateCourse, deleteCourse } = useCourses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [realMetrics, setRealMetrics] = useState<{ 
    revenue: number; 
    students: number; 
    avgProgress: number;
  }>({ revenue: 0, students: 0, avgProgress: 0 });

  const handleAddCourse = async (courseData: {
    title: string;
    description: string;
    category: string;
    duration: string;
    price: number;
    isFree: boolean;
    coverImage: string;
  }) => {
    try {
      console.log('Creating course with data:', courseData);
      await addCourse({
        title: courseData.title,
        description: courseData.description,
        category: courseData.category,
        duration: parseFloat(courseData.duration) || null,
        price: courseData.price,
        is_free: courseData.isFree,
        thumbnail: courseData.coverImage,
        is_published: false,
        modules: [],
        enrolled_users: [],
        rating: 0,
        reviews: 0
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating course:', error);
    }
  };

  const handleCourseUpdate = async (updatedCourse: Course) => {
    try {
      console.log('Updating course:', updatedCourse);
      await updateCourse(updatedCourse.id, updatedCourse);
    } catch (error) {
      console.error('Error updating course:', error);
    }
  };

  // Fetch real metrics
  useEffect(() => {
    const fetchRealMetrics = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Buscar vendas reais de cursos via payment_transactions
        const instructorCourses = courses.map(c => c.id);
        
        const { data: courseTransactions, error: transactionError } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('status', 'paid')
          .eq('item_type', 'course')
          .eq('teacher_id', user.id)
          .in('course_id', instructorCourses);

        if (transactionError) throw transactionError;

        const relevantTransactions = courseTransactions || [];

        const revenue = relevantTransactions.reduce((sum, transaction) => 
          sum + (transaction.amount || 0), 0
        );
        
        const students = relevantTransactions.length;

        // Buscar progresso médio dos alunos
        const { data: progressData, error: progressError } = await supabase
          .from('course_progress')
          .select('overall_progress, course_id')
          .in('course_id', instructorCourses);

        if (progressError) throw progressError;

        const avgProgress = progressData && progressData.length > 0
          ? progressData.reduce((sum, p) => sum + (p.overall_progress || 0), 0) / progressData.length
          : 0;

        setRealMetrics({ revenue, students, avgProgress });

        // Atualizar enrolled_users baseado em transações pagas reais
        for (const course of courses) {
          const courseTransactionUsers = relevantTransactions
            .filter(transaction => transaction.course_id === course.id)
            .map(transaction => transaction.student_id);
          
          const uniqueStudents = [...new Set(courseTransactionUsers)];
          
          if (uniqueStudents.length !== (course.enrolled_users?.length || 0)) {
            // Atualizar enrolled_users no banco com base em transações pagas
            await supabase
              .from('courses')
              .update({ enrolled_users: uniqueStudents })
              .eq('id', course.id);
          }
        }
      } catch (error) {
        console.error('Error fetching real metrics:', error);
      }
    };

    if (courses.length > 0) {
      fetchRealMetrics();
    }
  }, [courses]);

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card border-border p-3 sm:p-4 lg:p-5">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 icon-success" />
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm">Total de Cursos</p>
              <p className="text-lg sm:text-xl font-bold text-foreground">{courses.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-3 sm:p-4 lg:p-5">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 icon-info" />
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm">Total de Alunos</p>
              <p className="text-lg sm:text-xl font-bold text-foreground">{realMetrics.students}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-3 sm:p-4 lg:p-5">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 icon-warning" />
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm">Progresso Médio</p>
              <p className="text-lg sm:text-xl font-bold text-foreground">{Math.round(realMetrics.avgProgress)}%</p>
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-3 sm:p-4 lg:p-5">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Play className="w-6 h-6 sm:w-7 sm:h-7 icon-warning" />
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm">Receita Total</p>
              <p className="text-lg sm:text-xl font-bold text-foreground">R$ {realMetrics.revenue.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Cabeçalho com botão */}
      <div className="flex justify-between items-center">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">Cursos e Mentorias</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-branded">
              <Plus className="w-4 h-4 mr-2" />
              Criar Curso
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-sm max-h-[85vh] overflow-y-auto p-2 sm:p-3">
            <DialogHeader>
              <DialogTitle className="text-foreground">Criar Novo Curso</DialogTitle>
            </DialogHeader>
            <CourseForm onSubmit={handleAddCourse} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de cursos */}
      {loading ? (
        <div className="text-center text-muted-foreground">Carregando cursos...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Nenhum curso encontrado</p>
          <p className="text-sm text-muted-foreground">Crie seu primeiro curso para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {courses.map((course) => (
            <CourseCard 
              key={course.id} 
              course={course} 
              onCourseUpdate={handleCourseUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}