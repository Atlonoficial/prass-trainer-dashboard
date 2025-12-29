import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PaymentCancelled() {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate(-1); // Go back to previous page
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-800">Pagamento Cancelado</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Seu pagamento foi cancelado. Nenhuma cobrança foi realizada.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              Não se preocupe! Você pode tentar novamente a qualquer momento.
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <Button onClick={handleTryAgain} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>

          <div className="text-xs text-muted-foreground pt-4">
            <p>Precisa de ajuda? Entre em contato com o suporte.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}