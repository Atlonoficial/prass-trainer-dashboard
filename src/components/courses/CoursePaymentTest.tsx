import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePaymentProcessing } from '@/hooks/usePaymentProcessing';
import { useToast } from '@/hooks/use-toast';
import { Course } from '@/hooks/useCourses';
import { ExternalLink, CreditCard } from 'lucide-react';

interface CoursePaymentTestProps {
  course: Course;
}

export function CoursePaymentTest({ course }: CoursePaymentTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { createCheckout } = usePaymentProcessing();
  const { toast } = useToast();

  const handleBuyCourse = async () => {
    try {
      setIsLoading(true);
      
      console.log('🛒 Iniciando compra do curso:', course.title, course.id);
      
      const result = await createCheckout(null, course.id, 'pix');
      
      if (result?.checkout_url) {
        toast({
          title: "✅ Checkout criado com sucesso!",
          description: `URL: ${result.checkout_url}`,
        });
        
        // Abrir em nova aba
        window.open(result.checkout_url, '_blank');
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error) {
      console.error('❌ Erro no checkout do curso:', error);
      toast({
        title: "Erro no checkout",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (course.is_free) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-2">
          <Badge className="status-success">Curso Gratuito</Badge>
          <p className="text-sm text-muted-foreground">
            Este curso é gratuito e não requer pagamento
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="font-semibold">{course.title}</h3>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline">R$ {course.price?.toFixed(2)}</Badge>
            <Badge variant="outline">{course.category}</Badge>
          </div>
        </div>
        
        <Button 
          onClick={handleBuyCourse}
          disabled={isLoading}
          className="w-full btn-branded"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {isLoading ? 'Criando checkout...' : 'Comprar via Mercado Pago'}
        </Button>
        
        <div className="text-xs text-muted-foreground text-center">
          ⚡ Sistema integrado com Mercado Pago
          <br />
          🔄 Liberação automática após pagamento
        </div>
      </div>
    </Card>
  );
}