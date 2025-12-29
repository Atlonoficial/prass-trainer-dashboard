import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { BookOpen, Users, DollarSign, ShoppingCart } from 'lucide-react';
import { usePublishedCourses } from '@/hooks/usePublishedCourses';
import { usePurchases } from '@/hooks/usePurchases';
import StudentCourseCard from './StudentCourseCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function StudentCoursesTab() {
  const { courses, loading } = usePublishedCourses();
  const { purchasedItems, createPurchase } = usePurchases();

  // Calculate statistics
  const totalCourses = courses.length;
  const freeCourses = courses.filter(course => course.is_free).length;
  const paidCourses = totalCourses - freeCourses;
  
  // Purchased courses
  const purchasedCourseIds = purchasedItems
    .filter(item => item.type === 'course')
    .map(item => item.id);
  
  const myPurchasedCourses = purchasedItems.filter(item => item.type === 'course').length;
  const totalSpent = purchasedItems
    .filter(item => item.type === 'course')
    .reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium">Total de Cursos</span>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              Cursos disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium">Cursos Gratuitos</span>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{freeCourses}</div>
            <p className="text-xs text-muted-foreground">
              Acesso livre
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium">Cursos Adquiridos</span>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myPurchasedCourses}</div>
            <p className="text-xs text-muted-foreground">
              Seus cursos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium">Total Investido</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Valor investido
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Courses Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Cursos Disponíveis</h2>
            <p className="text-muted-foreground">
              Explore nossos cursos e comece seu aprendizado
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum curso encontrado</h3>
            <p className="text-muted-foreground">
              Ainda não há cursos publicados disponíveis
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {courses.map((course) => (
            <StudentCourseCard 
              key={course.id} 
              course={course}
              isPurchased={purchasedCourseIds.includes(course.id)}
              onPurchase={() => createPurchase(course.id, 'course')}
            />
          ))}
          </div>
        )}
      </div>
    </div>
  );
}