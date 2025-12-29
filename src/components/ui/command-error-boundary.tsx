import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CommandErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface CommandErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class CommandErrorBoundary extends React.Component<
  CommandErrorBoundaryProps,
  CommandErrorBoundaryState
> {
  constructor(props: CommandErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): CommandErrorBoundaryState {
    console.error('🚨 CommandErrorBoundary: Erro capturado:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 CommandErrorBoundary: Detalhes do erro:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert variant="destructive" className="m-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar o componente de seleção. Por favor, recarregue a página.
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}