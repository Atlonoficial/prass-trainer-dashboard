import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get('session_id');
  const transactionId = searchParams.get('transaction_id');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      toast({
        title: 'Pagamento Confirmado!',
        description: 'Seu acesso ao curso foi liberado com sucesso.',
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [toast]);

  const handleContinue = () => {
    // Redirect to student courses or dashboard
    navigate('/professor/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Confirmando seu pagamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-xl text-green-800">Pagamento Confirmado!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Seu pagamento foi processado com sucesso e o acesso ao curso foi liberado.
          </p>

          {sessionId && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <p>ID da Sessão: {sessionId.slice(0, 20)}...</p>
            </div>
          )}

          {transactionId && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <p>ID da Transação: {transactionId.slice(0, 20)}...</p>
            </div>
          )}

          <div className="space-y-2 pt-4">
            <Button onClick={handleContinue} className="w-full">
              <ArrowRight className="w-4 h-4 mr-2" />
              Acessar Meus Cursos
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>

          <div className="text-xs text-muted-foreground pt-4">
            <p>Você receberá um e-mail de confirmação em breve.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}