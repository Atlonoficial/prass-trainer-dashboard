import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, Star, Users, Lock, CreditCard } from 'lucide-react';
import { Course } from '@/hooks/useCourses';
import { useToast } from '@/hooks/use-toast';
import { usePaymentProcessing } from '@/hooks/usePaymentProcessing';

interface CourseAccessModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

export default function CourseAccessModal({ course, isOpen, onClose, onPurchaseSuccess }: CourseAccessModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { createCheckout } = usePaymentProcessing();

  const handlePurchase = async () => {
    try {
      setLoading(true);

      // Create checkout session for course
      const checkoutData = await createCheckout(null, course.id, 'pix');
      
      if (checkoutData.checkout_url) {
        // Redirect to payment gateway
        window.open(checkoutData.checkout_url, '_blank');
        
        toast({
          title: 'Redirecionando para Pagamento',
          description: 'Você será direcionado para finalizar a compra.',
        });
        
        // Close modal - user will return after payment
        onClose();
      } else {
        throw new Error('URL de checkout não disponível');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Erro no Pagamento',
        description: error instanceof Error ? error.message : 'Não foi possível processar o pagamento.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-2 sm:p-3">
        <DialogHeader className="pb-3 sm:pb-4">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            Adquirir Curso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Preview */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex gap-3 sm:gap-4">
                <img 
                  src={course.thumbnail || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=200&h=120&fit=crop'} 
                  alt={course.title}
                  className="w-20 h-14 sm:w-24 sm:h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-base sm:text-lg">{course.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
                    {course.description}
                  </p>
                  <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.total_duration_minutes ? `${Math.round(course.total_duration_minutes / 60)}h` : course.duration ? `${course.duration}h` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      <span>{course.rating ? course.rating.toFixed(1) : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{course.enrolled_users?.length || 0} alunos</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Features */}
          <div>
            <h4 className="font-medium mb-3">O que você terá acesso:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Acesso vitalício ao conteúdo</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{course.total_lessons || 0} aulas completas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Materiais complementares para download</span>
              </div>
              {course.has_certificate && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Certificado de conclusão</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Suporte via chat do instrutor</span>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <Card className="border-primary">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-2 sm:space-y-3">
                <div>
                  <span className="text-xl sm:text-2xl font-bold">R$ {course.price?.toFixed(2) || '0,00'}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground ml-2">pagamento único</span>
                </div>
                
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-xs">Oferta Limitada</Badge>
                  <Badge variant="outline" className="text-xs">Acesso Vitalício</Badge>
                </div>

                <Button 
                  onClick={handlePurchase}
                  disabled={loading}
                  className="w-full py-2 sm:py-2.5 text-sm sm:text-base"
                >
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  {loading ? 'Processando...' : 'Adquirir Agora'}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Pagamento processado via gateway configurado pelo professor
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}