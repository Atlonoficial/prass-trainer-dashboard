import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Eye, EyeOff, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { use2FA } from '@/hooks/use2FA';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEnabled: boolean;
}

export function TwoFactorAuthModal({ open, onOpenChange, isEnabled }: TwoFactorAuthModalProps) {
  const [step, setStep] = useState<'phone' | 'verify' | 'backup' | 'disable'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  
  const { enable2FA, disable2FA, sendVerificationCode, verifyCode, isEnabling, isDisabling } = use2FA();
  const { toast } = useToast();

  const resetModal = () => {
    setStep('phone');
    setPhoneNumber('');
    setVerificationCode('');
    setBackupCodes([]);
    setShowBackupCodes(false);
    setCodeSent(false);
    setIsVerifying(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetModal();
    }
    onOpenChange(open);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX
    if (digits.length <= 11) {
      const match = digits.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
      if (match) {
        return `${match[1] ? '(' + match[1] : ''}${match[1] && match[1].length === 2 ? ') ' : ''}${match[2]}${match[2] && match[3] ? '-' : ''}${match[3]}`;
      }
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSendCode = async () => {
    if (phoneNumber.length < 14) {
      toast({
        title: 'Erro',
        description: 'Digite um número de telefone válido',
        variant: 'destructive'
      });
      return;
    }

    const success = await sendVerificationCode(phoneNumber);
    if (success) {
      setCodeSent(true);
      setStep('verify');
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: 'Erro',
        description: 'Digite um código de 6 dígitos',
        variant: 'destructive'
      });
      return;
    }

    setIsVerifying(true);
    const isValid = await verifyCode(verificationCode, phoneNumber);
    
    if (isValid) {
      const result = await enable2FA(phoneNumber);
      if (result && typeof result === 'object' && result.success && result.backupCodes) {
        setBackupCodes(result.backupCodes);
        setStep('backup');
      }
    }
    setIsVerifying(false);
  };

  const handleDisable2FA = async () => {
    const success = await disable2FA();
    if (success) {
      handleOpenChange(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado',
      description: 'Código copiado para a área de transferência'
    });
  };

  const copyAllCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast({
      title: 'Códigos copiados',
      description: 'Todos os códigos foram copiados para a área de transferência'
    });
  };

  React.useEffect(() => {
    if (open && isEnabled) {
      setStep('disable');
    } else if (open && !isEnabled) {
      setStep('phone');
    }
  }, [open, isEnabled]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isEnabled ? 'Desativar 2FA' : 'Ativar Autenticação 2FA'}
          </DialogTitle>
        </DialogHeader>

        {/* Disable 2FA */}
        {step === 'disable' && (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                A autenticação de dois fatores está ativa. Desativá-la reduzirá a segurança da sua conta.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable2FA}
                disabled={isDisabling}
                className="flex-1"
              >
                {isDisabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Desativando...
                  </>
                ) : (
                  'Desativar 2FA'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Phone Number */}
        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Número do Celular</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phoneNumber}
                onChange={handlePhoneChange}
                maxLength={15}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Enviaremos um código de verificação para este número
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendCode}
                disabled={phoneNumber.length < 14}
                className="flex-1"
              >
                Enviar Código
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Verify Code */}
        {step === 'verify' && (
          <div className="space-y-4">
            {codeSent && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Código enviado para {phoneNumber}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="code">Código de Verificação</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('phone')}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || isVerifying || isEnabling}
                className="flex-1"
              >
                {isVerifying || isEnabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === 'backup' && (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>2FA ativado com sucesso!</strong> Guarde estes códigos de backup em local seguro. 
                Você pode usá-los para acessar sua conta se não conseguir receber SMS.
              </AlertDescription>
            </Alert>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Códigos de Recuperação</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBackupCodes(!showBackupCodes)}
                  >
                    {showBackupCodes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAllCodes}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-background rounded text-sm font-mono cursor-pointer hover:bg-accent"
                    onClick={() => copyToClipboard(code)}
                  >
                    <span>{showBackupCodes ? code : '••••••••'}</span>
                    <Copy className="h-3 w-3 opacity-50" />
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Clique em um código para copiá-lo
              </p>
            </div>

            <Button
              onClick={() => handleOpenChange(false)}
              className="w-full"
            >
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}