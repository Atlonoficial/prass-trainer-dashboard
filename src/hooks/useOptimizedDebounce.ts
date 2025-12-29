import { useCallback, useRef } from 'react';

// FASE 2: Debounce otimizado simplificado
export function useOptimizedDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {}
) {
  const { leading = false, trailing = true, maxWait } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);
  const argsRef = useRef<Parameters<T>>();

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    lastInvokeTimeRef.current = 0;
    lastCallTimeRef.current = 0;
    argsRef.current = undefined;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current && argsRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
      return callback(...argsRef.current);
    }
  }, [callback]);

  const debounced = useCallback((...args: Parameters<T>) => {
    const time = Date.now();
    lastCallTimeRef.current = time;
    argsRef.current = args;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const shouldInvokeLeading = leading && (lastInvokeTimeRef.current === 0 || 
      (maxWait && time - lastInvokeTimeRef.current >= maxWait));

    if (shouldInvokeLeading) {
      lastInvokeTimeRef.current = time;
      return callback(...args);
    }

    timeoutRef.current = setTimeout(() => {
      if (trailing && argsRef.current) {
        lastInvokeTimeRef.current = Date.now();
        callback(...argsRef.current);
      }
    }, delay);
  }, [callback, delay, leading, trailing, maxWait]) as T & {
    cancel: () => void;
    flush: () => ReturnType<T> | undefined;
  };

  // Anexar métodos
  (debounced as any).cancel = cancel;
  (debounced as any).flush = flush;

  return debounced;
}

// Hook especializado para busca
export function useSearchDebounce(
  onSearch: (term: string) => void,
  delay = 300
) {
  const debouncedSearch = useOptimizedDebounce(
    onSearch,
    delay,
    { leading: false, trailing: true, maxWait: 1000 }
  );

  const instantSearch = useCallback((term: string) => {
    if (term.length <= 1) {
      debouncedSearch.cancel();
      onSearch(term);
    } else {
      debouncedSearch(term);
    }
  }, [debouncedSearch, onSearch]);

  return {
    search: instantSearch,
    cancelSearch: debouncedSearch.cancel,
    flushSearch: debouncedSearch.flush
  };
}