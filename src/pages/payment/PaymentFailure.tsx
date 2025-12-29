import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const paymentId = searchParams.get('payment_id');
  const preferenceId = searchParams.get('preference_id');
  const status = searchParams.get('status');

  useEffect(() => {
    toast({
      title: "Pagamento não realizado",
      description: "Houve um problema com seu pagamento. Tente novamente.",
      variant: "destructive"
    });
  }, [toast]);

  const handleRetry = () => {
    navigate('/');
  };

  return (
    <div className="container mx-auto py-8 flex justify-center items-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-600">
            Pagamento Cancelado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-muted-foreground">
              Seu pagamento não foi processado. Isso pode ter ocorrido por diversos motivos:
            </p>
            
            <ul className="mt-4 text-sm text-muted-foreground space-y-1">
              <li>• Pagamento cancelado pelo usuário</li>
              <li>• Problemas com o método de pagamento</li>
              <li>• Falha na comunicação com o banco</li>
            </ul>
          </div>
          
          {(paymentId || preferenceId) && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Informações da Tentativa</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Status:</strong> {status || 'failure'}</p>
                {paymentId && <p><strong>ID Pagamento:</strong> {paymentId}</p>}
                {preferenceId && <p><strong>ID Preferência:</strong> {preferenceId}</p>}
              </div>
            </div>
          )}
          
          <div className="flex flex-col space-y-2">
            <Button onClick={handleRetry} className="w-full">
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Voltar ao Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}