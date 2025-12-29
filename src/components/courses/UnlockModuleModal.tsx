import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Star, Clock, Award, Play } from 'lucide-react';
import { Course } from '@/hooks/useCourses';
import { usePaymentProcessing } from '@/hooks/usePaymentProcessing';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface UnlockModuleModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

export default function UnlockModuleModal({ 
  course, 
  isOpen, 
  onClose, 
  onPurchaseSuccess 
}: UnlockModuleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { createCheckout } = usePaymentProcessing();

  const handleUnlock = async () => {
    try {
      setIsLoading(true);
      
      // Criar checkout do curso via Mercado Pago
      const result = await createCheckout(null, course.id, 'pix');
      
      if (result?.checkout_url) {
        toast({
          title: "Redirecionando para pagamento",
          description: "Você será redirecionado para completar o pagamento.",
        });
        
        // Abrir pagamento em nova aba
        window.open(result.checkout_url, '_blank');
        
        // Fechar modal após redirecionamento
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        throw new Error('URL de checkout não foi retornada');
      }
    } catch (error) {
      console.error('Erro ao criar checkout do curso:', error);
      toast({
        title: "Erro ao processar pagamento",
        description: "Não foi possível criar o checkout. Verifique as configurações de pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-warning" />
            Módulo Bloqueado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Preview */}
          <Card className="p-4 space-y-3">
            <div className="relative">
              <img 
                src={course.thumbnail || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=250&fit=crop'} 
                alt={course.title}
                className="w-full h-32 object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{course.category || 'Curso'}</Badge>
                <Badge variant="secondary" className="text-warning border-warning/20">
                  Curso Pago
                </Badge>
              </div>
              <h3 className="font-semibold">{course.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {course.description}
              </p>
            </div>

            {/* Course Stats */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{course.duration || 0} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                <span>{(course.rating || 0).toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span>{course.total_lessons || 0} aulas</span>
              </div>
            </div>
          </Card>

          {/* Unlock Info */}
          <div className="text-center space-y-3">
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <Lock className="w-8 h-8 text-warning mx-auto mb-2" />
              <p className="text-sm font-medium mb-1">Conteúdo Bloqueado</p>
              <p className="text-xs text-muted-foreground">
                Este módulo faz parte de um curso pago. Desbloqueie para acessar todo o conteúdo.
              </p>
            </div>

            {/* Benefits */}
            <div className="text-left space-y-2">
              <p className="text-sm font-medium">O que você ganha:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Play className="w-3 h-3 text-success" />
                  <span>Acesso completo a todas as aulas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Award className="w-3 h-3 text-success" />
                  <span>Certificado de conclusão</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-success" />
                  <span>Acesso vitalício ao conteúdo</span>
                </li>
              </ul>
            </div>

            {/* Price */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <span className="text-2xl font-bold text-primary">
                  {course.price ? `R$ ${course.price.toFixed(2)}` : 'Gratuito'}
                </span>
                <p className="text-xs text-muted-foreground">Pagamento único</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUnlock}
              disabled={isLoading}
              className="flex-1 btn-branded"
            >
              {isLoading ? 'Processando...' : 'Desbloquear Curso'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}