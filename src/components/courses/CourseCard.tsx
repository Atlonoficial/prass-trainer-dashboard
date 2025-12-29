import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Edit3, Eye, Users, Star, Clock } from 'lucide-react';
import { Course } from '@/hooks/useCourses';
import EditCourseModal from './EditCourseModal';
import StudentViewModal from './StudentViewModal';

interface CourseCardProps {
  course: Course;
  onCourseUpdate?: (course: Course) => void;
}

export default function CourseCard({ course, onCourseUpdate }: CourseCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStudentViewOpen, setIsStudentViewOpen] = useState(false);

  const handleCourseUpdate = (updatedCourse: Course) => {
    onCourseUpdate?.(updatedCourse);
  };

  return (
    <>
      <Card className="bg-card border-border overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative">
          <img
            src={course.thumbnail || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=250&fit=crop'}
            alt={course.title}
            className="w-full h-40 object-cover"
          />
          <div className="absolute top-2 left-2">
            {course.is_free ? (
              <Badge className="status-success">Gratuito</Badge>
            ) : (
              <Badge className="status-info">R$ {(course.price || 0).toFixed(2)}</Badge>
            )}
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-card/80 text-foreground border-border">
              {course.category}
            </Badge>
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">{course.title}</h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{course.description}</p>

          <div className="flex items-center space-x-4 mb-3 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{course.duration ? `${course.duration}h` : 'N/A'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{course.enrolled_users?.length || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span>{(course.rating || 0).toFixed(1)}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progresso Médio</span>
              <span className="text-foreground">{Math.round((course.rating || 0) * 20)}%</span>
            </div>
            <Progress value={Math.round((course.rating || 0) * 20)} className="h-2" />
          </div>

          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Editar
            </Button>
            <Button 
              size="sm" 
              className="flex-1 btn-branded"
              onClick={() => setIsStudentViewOpen(true)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver Curso
            </Button>
          </div>
        </div>
      </Card>

      <EditCourseModal
        course={course}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleCourseUpdate}
      />

      <StudentViewModal
        course={course}
        isOpen={isStudentViewOpen}
        onClose={() => setIsStudentViewOpen(false)}
        hasAccess={true}
      />
    </>
  );
}