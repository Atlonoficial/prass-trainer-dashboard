import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);

  const paymentId = searchParams.get('payment_id');
  const preferenceId = searchParams.get('preference_id');
  const status = searchParams.get('status');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentId && !preferenceId) {
        toast({
          title: "Erro",
          description: "Dados de pagamento não encontrados",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      try {
        // Buscar transação no banco de dados
        const { data: transaction, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .or(`gateway_payment_id.eq.${paymentId},gateway_preference_id.eq.${preferenceId}`)
          .single();

        if (error || !transaction) {
          console.error('Erro ao buscar transação:', error);
          toast({
            title: "Transação não encontrada",
            description: "Não foi possível verificar o pagamento. Entre em contato com o suporte.",
            variant: "destructive"
          });
        } else {
          setPaymentData(transaction);
          if (transaction.status === 'paid') {
            toast({
              title: "Pagamento confirmado!",
              description: "Seu pagamento foi processado com sucesso.",
            });
          }
        }
      } catch (error) {
        console.error('Erro na verificação:', error);
        toast({
          title: "Erro na verificação",
          description: "Não foi possível verificar o status do pagamento.",
          variant: "destructive"
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [paymentId, preferenceId, toast, navigate]);

  if (verifying) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="text-xl font-semibold">Verificando pagamento...</h2>
              <p className="text-muted-foreground text-center">
                Aguarde enquanto confirmamos seu pagamento
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 flex justify-center items-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            Pagamento Realizado!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-muted-foreground">
              Seu pagamento foi processado com sucesso.
            </p>
            
            {paymentData && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Detalhes do Pagamento</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Valor:</strong> R$ {paymentData.amount}</p>
                  <p><strong>Status:</strong> {paymentData.status === 'paid' ? 'Pago' : 'Processando'}</p>
                  {paymentId && <p><strong>ID Pagamento:</strong> {paymentId}</p>}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button onClick={() => navigate('/')} className="w-full">
              Voltar ao Início
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
              Ir para Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}