import { useCallback, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface PaymentResilienceState {
  isOnline: boolean;
  retryCount: number;
  lastError: Error | null;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

export function usePaymentResilience(config: Partial<RetryConfig> = {}) {
  const { toast } = useToast();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<PaymentResilienceState>({
    isOnline: navigator.onLine,
    retryCount: 0,
    lastError: null
  });

  // Calculate retry delay with exponential backoff
  const calculateDelay = useCallback((attempt: number) => {
    const delay = Math.min(
      finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
      finalConfig.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }, [finalConfig]);

  // Resilient function wrapper with retry logic
  const withResilience = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string = 'Payment Operation'
  ): Promise<T> => {
    const executeWithRetry = async (attempt: number): Promise<T> => {
      try {
        console.log(`[PaymentResilience] Executing ${operationName}, attempt ${attempt + 1}`);
        
        // Check if we're online
        if (!navigator.onLine) {
          throw new Error('Sistema offline. Verifique sua conexão.');
        }

        const result = await operation();
        
        // Reset retry count on success
        if (attempt > 0) {
          console.log(`[PaymentResilience] ${operationName} succeeded after ${attempt + 1} attempts`);
          toast({
            title: 'Conexão Restaurada',
            description: 'Operação concluída com sucesso.',
            duration: 3000
          });
        }
        
        setState(prev => ({ ...prev, retryCount: 0, lastError: null }));
        return result;
        
      } catch (error: any) {
        console.error(`[PaymentResilience] ${operationName} failed on attempt ${attempt + 1}:`, error);
        
        setState(prev => ({ 
          ...prev, 
          retryCount: attempt + 1, 
          lastError: error 
        }));

        // Don't retry for certain error types
        const nonRetriableErrors = [
          'PGRST116', // Not found - normal for settings
          '401', // Unauthorized
          '403', // Forbidden
          'AbortError' // Request cancelled
        ];

        const isNonRetriable = nonRetriableErrors.some(code => 
          error.message?.includes(code) || error.code?.includes(code) || error.name?.includes(code)
        );

        if (isNonRetriable) {
          console.log(`[PaymentResilience] Non-retriable error for ${operationName}:`, error.message);
          throw error;
        }

        // Check if we should retry
        if (attempt < finalConfig.maxRetries) {
          const delay = calculateDelay(attempt);
          console.log(`[PaymentResilience] Retrying ${operationName} in ${delay}ms...`);
          
          // Show user-friendly message for retries
          if (attempt === 0) {
            toast({
              title: 'Reconectando...',
              description: `Tentando reestabelecer conexão para ${operationName.toLowerCase()}.`,
              duration: 2000
            });
          }

          return new Promise((resolve, reject) => {
            retryTimeoutRef.current = setTimeout(async () => {
              try {
                const result = await executeWithRetry(attempt + 1);
                resolve(result);
              } catch (retryError) {
                reject(retryError);
              }
            }, delay);
          });
        } else {
          // Max retries reached
          console.error(`[PaymentResilience] Max retries (${finalConfig.maxRetries}) reached for ${operationName}`);
          
          toast({
            title: 'Falha na Conexão',
            description: `Não foi possível executar ${operationName.toLowerCase()}. Tente novamente mais tarde.`,
            variant: 'destructive',
            duration: 5000
          });
          
          throw new Error(`${operationName} falhou após ${finalConfig.maxRetries} tentativas: ${error.message}`);
        }
      }
    };

    return executeWithRetry(0);
  }, [finalConfig, toast, calculateDelay]);

  // Circuit breaker pattern
  const [circuitBreakerState, setCircuitBreakerState] = useState<'closed' | 'open' | 'half-open'>('closed');
  const failureCountRef = useRef(0);
  const lastFailureTimeRef = useRef(0);
  const circuitBreakerTimeout = 30000; // 30 seconds
  const failureThreshold = 5;

  const withCircuitBreaker = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string = 'Payment Operation'
  ): Promise<T> => {
    const now = Date.now();

    // Check circuit breaker state
    if (circuitBreakerState === 'open') {
      if (now - lastFailureTimeRef.current > circuitBreakerTimeout) {
        console.log('[PaymentResilience] Circuit breaker moving to half-open');
        setCircuitBreakerState('half-open');
      } else {
        throw new Error(`Sistema temporariamente indisponível. Tente novamente em ${Math.round((circuitBreakerTimeout - (now - lastFailureTimeRef.current)) / 1000)} segundos.`);
      }
    }

    try {
      const result = await withResilience(operation, operationName);
      
      // Success - reset circuit breaker
      if (circuitBreakerState !== 'closed') {
        console.log('[PaymentResilience] Circuit breaker reset to closed');
        setCircuitBreakerState('closed');
        failureCountRef.current = 0;
      }
      
      return result;
    } catch (error) {
      failureCountRef.current++;
      lastFailureTimeRef.current = now;

      // Open circuit breaker if threshold reached
      if (failureCountRef.current >= failureThreshold && circuitBreakerState === 'closed') {
        console.error('[PaymentResilience] Circuit breaker opened due to too many failures');
        setCircuitBreakerState('open');
        
        toast({
          title: 'Sistema Temporariamente Indisponível',
          description: 'O sistema de pagamentos será reativado automaticamente em alguns minutos.',
          variant: 'destructive',
          duration: 10000
        });
      }

      throw error;
    }
  }, [withResilience, circuitBreakerState]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  return {
    withResilience,
    withCircuitBreaker,
    state,
    cleanup,
    circuitBreakerState
  };
}