import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function PaymentPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const paymentId = searchParams.get('payment_id');
  const preferenceId = searchParams.get('preference_id');
  const status = searchParams.get('status');

  useEffect(() => {
    const fetchPaymentData = async () => {
      if (paymentId || preferenceId) {
        try {
          const { data: transaction } = await supabase
            .from('payment_transactions')
            .select('*')
            .or(`gateway_payment_id.eq.${paymentId},gateway_preference_id.eq.${preferenceId}`)
            .single();

          if (transaction) {
            setPaymentData(transaction);
          }
        } catch (error) {
          console.error('Erro ao buscar dados do pagamento:', error);
        }
      }
    };

    fetchPaymentData();
  }, [paymentId, preferenceId]);

  const checkPaymentStatus = async () => {
    setChecking(true);
    try {
      // Simular verificação de status
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Status verificado",
        description: "O status do pagamento ainda está pendente. Aguarde alguns minutos.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro na verificação",
        description: "Não foi possível verificar o status no momento.",
        variant: "destructive"
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="container mx-auto py-8 flex justify-center items-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Clock className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl text-yellow-600">
            Pagamento Pendente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-muted-foreground">
              Seu pagamento está sendo processado. Isso pode levar alguns minutos.
            </p>
            
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h3 className="font-semibold mb-2">O que fazer agora?</h3>
              <ul className="text-sm space-y-1">
                <li>• Aguarde a confirmação por email</li>
                <li>• Para PIX, finalize o pagamento no app do seu banco</li>
                <li>• Para boleto, pague até o vencimento</li>
              </ul>
            </div>
          </div>
          
          {paymentData && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Detalhes do Pagamento</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Valor:</strong> R$ {paymentData.amount}</p>
                <p><strong>Status:</strong> Processando</p>
                {paymentId && <p><strong>ID Pagamento:</strong> {paymentId}</p>}
              </div>
            </div>
          )}
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={checkPaymentStatus} 
              disabled={checking}
              className="w-full"
            >
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Status'
              )}
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