import { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Eye, Users, Star, Clock, BookOpen, Lock, ShoppingCart } from 'lucide-react';
import { Course } from '@/hooks/useCourses';
import { useUserAccess } from '@/hooks/useUserAccess';
import StudentViewModal from './StudentViewModal';
import CourseAccessModal from './CourseAccessModal';

interface StudentCourseCardProps {
  course: Course;
  isPurchased?: boolean;
  onPurchase?: () => void;
}

export default function StudentCourseCard({ 
  course, 
  isPurchased = false,
  onPurchase 
}: StudentCourseCardProps) {
  const [isStudentViewOpen, setIsStudentViewOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const { hasAccess, loading: accessLoading } = useUserAccess(course.id);

  const handleAccessRefresh = () => {
    // O hook useUserAccess será atualizado automaticamente
    window.location.reload(); // Força refresh para atualizar o estado
  };

  return (
    <>
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg line-clamp-2 mb-2">{course.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {course.description || 'Sem descrição'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={course.is_free ? 'secondary' : hasAccess ? 'default' : 'destructive'}>
              {course.is_free ? 'Gratuito' : hasAccess ? 'Adquirido' : `R$ ${course.price?.toFixed(2)}`}
            </Badge>
            {course.category && (
              <Badge variant="outline">{course.category}</Badge>
            )}
            {!course.is_free && !hasAccess && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <Lock className="w-3 h-3 mr-1" />
                Bloqueado
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-4">
          {course.thumbnail && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img 
                src={course.thumbnail} 
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{course.total_duration_minutes ? `${course.total_duration_minutes} min` : course.duration ? `${course.duration}h` : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{course.enrolled_users?.length || 0} alunos</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>{course.total_lessons || 0} aulas</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <span>{course.rating ? course.rating.toFixed(1) : 'N/A'}</span>
            </div>
          </div>

          {course.rating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Avaliação</span>
                <span>{course.rating.toFixed(1)}/5</span>
              </div>
              <Progress value={(course.rating / 5) * 100} className="h-2" />
            </div>
          )}
        </CardContent>

        <CardFooter>
          {course.is_free || hasAccess ? (
            <Button 
              onClick={() => setIsStudentViewOpen(true)}
              className="w-full" 
              variant="outline"
              disabled={accessLoading}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Curso
            </Button>
          ) : (
            <Button 
              onClick={() => setIsAccessModalOpen(true)}
              className="w-full" 
              variant="default"
              disabled={accessLoading}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Adquirir Curso
            </Button>
          )}
        </CardFooter>
      </Card>

      <StudentViewModal
        course={course}
        isOpen={isStudentViewOpen}
        onClose={() => setIsStudentViewOpen(false)}
        hasAccess={hasAccess}
      />

      <CourseAccessModal
        course={course}
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        onPurchaseSuccess={handleAccessRefresh}
      />
    </>
  );
}