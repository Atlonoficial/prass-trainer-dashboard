import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, RefreshCw, Shield, Settings } from 'lucide-react';
import { usePaymentValidation } from '@/hooks/usePaymentValidation';

interface PaymentValidationPanelProps {
  className?: string;
}

export function PaymentValidationPanel({ className = "" }: PaymentValidationPanelProps) {
  const { getPaymentConfigStatus, loading, isPaymentConfigured } = usePaymentValidation();
  
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const paymentStatus = getPaymentConfigStatus();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusIcon = () => {
    switch (paymentStatus.status) {
      case 'configured':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'loading':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus.status) {
      case 'configured':
        return { variant: 'default', label: 'Configurado' };
      case 'loading':
        return { variant: 'secondary', label: 'Carregando' };
      case 'inactive':
        return { variant: 'outline', label: 'Inativo' };
      default:
        return { variant: 'destructive', label: 'Não Configurado' };
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Status dos Pagamentos
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Verificando configurações...</p>
          </div>
        ) : (
          <>
            {/* Payment Status Summary */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-sm font-medium">{paymentStatus.message}</span>
              </div>
              
              <Badge variant={getStatusBadge().variant as any}>
                {getStatusBadge().label}
              </Badge>
            </div>

            {/* Configuration Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Mercado Pago</span>
                <span className={`text-sm ${isPaymentConfigured() ? 'text-green-600' : 'text-red-600'}`}>
                  {isPaymentConfigured() ? 'Configurado' : 'Não Configurado'}
                </span>
              </div>
            </div>

            {/* Action Button */}
            {paymentStatus.action === 'configure' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.location.href = '/?section=pagamentos'}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar Pagamentos
              </Button>
            )}

            {/* Success Message */}
            {paymentStatus.status === 'configured' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Sistema de pagamentos funcionando corretamente.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}