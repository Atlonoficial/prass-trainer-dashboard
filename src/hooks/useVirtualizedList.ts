import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

// FASE 3: Lista virtualizada para performance
interface VirtualizedListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Itens extras para renderizar fora da viewport
  threshold?: number; // Limite para ativar virtualização
}

export function useVirtualizedList<T>(
  items: T[],
  options: VirtualizedListOptions
) {
  const { itemHeight, containerHeight, overscan = 5, threshold = 50 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  // Calcular viewport
  const viewport = useMemo(() => {
    if (items.length < threshold) {
      // Se poucos itens, não virtualizar
      return {
        startIndex: 0,
        endIndex: items.length - 1,
        totalHeight: items.length * itemHeight,
        visibleItems: items,
        offsetY: 0,
        shouldVirtualize: false
      };
    }

    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    // Adicionar overscan
    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(items.length - 1, visibleEnd + overscan);
    
    const visibleItems = items.slice(startIndex, endIndex + 1);
    const offsetY = startIndex * itemHeight;
    const totalHeight = items.length * itemHeight;

    return {
      startIndex,
      endIndex,
      totalHeight,
      visibleItems,
      offsetY,
      shouldVirtualize: true
    };
  }, [items, scrollTop, itemHeight, containerHeight, overscan, threshold]);

  // Handler para scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const element = event.currentTarget;
    setScrollTop(element.scrollTop);
    scrollElementRef.current = element;
  }, []);

  // Scroll para item específico
  const scrollToItem = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!scrollElementRef.current) return;
    
    const targetScrollTop = index * itemHeight;
    scrollElementRef.current.scrollTo({
      top: targetScrollTop,
      behavior
    });
  }, [itemHeight]);

  // Scroll para início
  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollToItem(0, behavior);
  }, [scrollToItem]);

  // Props para o container da lista
  const containerProps = useMemo(() => ({
    style: {
      height: containerHeight,
      overflow: 'auto' as const
    },
    onScroll: handleScroll
  }), [containerHeight, handleScroll]);

  // Props para o wrapper interno (com altura total)
  const innerProps = useMemo(() => ({
    style: {
      height: viewport.totalHeight,
      position: 'relative' as const
    }
  }), [viewport.totalHeight]);

  // Props para a lista visível
  const listProps = useMemo(() => ({
    style: viewport.shouldVirtualize ? {
      transform: `translateY(${viewport.offsetY}px)`
    } : undefined
  }), [viewport.shouldVirtualize, viewport.offsetY]);

  return {
    // Dados calculados
    visibleItems: viewport.visibleItems,
    startIndex: viewport.startIndex,
    endIndex: viewport.endIndex,
    totalItems: items.length,
    
    // Props para elementos DOM
    containerProps,
    innerProps,
    listProps,
    
    // Métodos de controle
    scrollToItem,
    scrollToTop,
    
    // Estado
    scrollTop,
    isVirtualized: viewport.shouldVirtualize
  };
}

// Hook especializado para tabelas virtualizadas
export function useVirtualizedTable<T>(
  items: T[],
  rowHeight = 60,
  containerHeight = 400,
  options?: Partial<VirtualizedListOptions>
) {
  const virtualizedList = useVirtualizedList(items, {
    itemHeight: rowHeight,
    containerHeight,
    ...options
  });

  // Adicionar índices reais aos itens visíveis
  const rowsWithIndex = useMemo(() => 
    virtualizedList.visibleItems.map((item, index) => ({
      item,
      originalIndex: virtualizedList.startIndex + index,
      virtualIndex: index
    }))
  , [virtualizedList.visibleItems, virtualizedList.startIndex]);

  return {
    ...virtualizedList,
    rows: rowsWithIndex
  };
}

// Hook para busca rápida em listas grandes
export function useVirtualizedSearch<T>(
  allItems: T[],
  searchFn: (item: T, query: string) => boolean,
  containerHeight = 400,
  itemHeight = 60
) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar itens baseado na busca
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems;
    
    return allItems.filter(item => searchFn(item, searchQuery));
  }, [allItems, searchQuery, searchFn]);

  // Usar virtualização nos itens filtrados
  const virtualizedList = useVirtualizedList(filteredItems, {
    itemHeight,
    containerHeight,
    threshold: 20 // Limite menor para busca
  });

  // Stats da busca
  const searchStats = useMemo(() => ({
    totalItems: allItems.length,
    filteredItems: filteredItems.length,
    isFiltered: !!searchQuery.trim(),
    hasResults: filteredItems.length > 0
  }), [allItems.length, filteredItems.length, searchQuery]);

  return {
    ...virtualizedList,
    searchQuery,
    setSearchQuery,
    searchStats,
    allItems
  };
}