import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { detectOrigin, detectUserTypeFromUrl } from '@/utils/domainDetector';

export default function EmailSent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isResending, setIsResending] = useState(false);
  const email = localStorage.getItem('pendingEmail');

  const handleResendEmail = async () => {
    if (!email) {
      toast.error('Email não encontrado');
      return;
    }

    // Detectar tipo de usuário dinamicamente
    const userType = detectUserTypeFromUrl();
    const redirectUrl = detectOrigin(userType);

    console.log('[EmailSent] Reenviando email:', {
      userType,
      redirectUrl,
      pathname: location.pathname,
      hostname: window.location.hostname
    });

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;
      toast.success('Email de confirmação reenviado!');
    } catch (error: any) {
      console.error('Erro ao reenviar email:', error);
      toast.error(error.message || 'Erro ao reenviar email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-width container mx-auto">
        <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-10 h-10 text-primary" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Verifique seu email
            </h1>
            <p className="text-muted-foreground text-lg">
              Enviamos um link de confirmação para
            </p>
            <p className="text-primary font-semibold">
              {email || 'seu email'}
            </p>
          </div>

          {/* Instructions */}
          <div className="max-w-md space-y-4 text-muted-foreground">
            <p>
              Clique no link no email para confirmar sua conta e começar a usar o Prass Trainer.
            </p>
            <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
              <p className="font-medium text-foreground">Não recebeu o email?</p>
              <ul className="list-disc list-inside space-y-1 text-left">
                <li>Verifique sua caixa de spam</li>
                <li>Aguarde alguns minutos</li>
                <li>Clique abaixo para reenviar</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <Button
              variant="outline"
              onClick={() => navigate('/auth')}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao login
            </Button>
            <Button
              onClick={handleResendEmail}
              disabled={isResending}
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? 'Reenviando...' : 'Reenviar email'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}