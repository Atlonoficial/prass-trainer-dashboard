import React, { Component, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface PaymentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface PaymentErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class PaymentErrorBoundary extends Component<PaymentErrorBoundaryProps, PaymentErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: PaymentErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<PaymentErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PaymentErrorBoundary] Payment system error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });

    this.setState({
      error,
      errorInfo
    });

    // Send error to monitoring service if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: `Payment Error: ${error.message}`,
        fatal: false
      });
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log('[PaymentErrorBoundary] Retrying payment system...', this.state.retryCount + 1);
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      console.error('[PaymentErrorBoundary] Max retries reached, showing permanent error state');
    }
  };

  handleReset = () => {
    console.log('[PaymentErrorBoundary] Resetting error boundary');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="bg-card border-destructive/20 p-8 mx-auto max-w-md">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Sistema de Pagamentos Temporariamente Indisponível
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {this.state.retryCount < this.maxRetries 
                  ? 'Ocorreu um erro no sistema de pagamentos. Tentaremos novamente automaticamente.'
                  : 'O sistema encontrou múltiplos erros. Tente recarregar a página.'
                }
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left bg-muted p-3 rounded text-xs mb-4">
                  <summary className="cursor-pointer font-medium">Detalhes do Erro</summary>
                  <pre className="mt-2 overflow-auto">{this.state.error.message}</pre>
                </details>
              )}
            </div>

            <div className="flex gap-2 justify-center">
              {this.state.retryCount < this.maxRetries ? (
                <Button 
                  onClick={this.handleRetry}
                  className="bg-primary hover:bg-primary/90"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Tentar Novamente ({this.maxRetries - this.state.retryCount} restantes)
                </Button>
              ) : (
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Recarregar Página
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={this.handleReset}
                disabled={this.state.retryCount >= this.maxRetries}
              >
                Limpar Erro
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}