import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * Hook for memoizing expensive calculations
 */
export const useExpensiveMemo = <T>(
  factory: () => T,
  deps: React.DependencyList,
  shouldUpdate?: (prevDeps: React.DependencyList, nextDeps: React.DependencyList) => boolean
): T => {
  const prevDepsRef = useRef<React.DependencyList>(deps);
  
  return useMemo(() => {
    if (shouldUpdate) {
      const shouldUpdateResult = shouldUpdate(prevDepsRef.current, deps);
      prevDepsRef.current = deps;
      if (!shouldUpdateResult) {
        return factory();
      }
    }
    prevDepsRef.current = deps;
    return factory();
  }, deps);
};

/**
 * Hook for memoizing callbacks with stable references
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });
  
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, deps) as T;
};

/**
 * Hook for lazy initialization of expensive values
 */
export const useLazyValue = <T>(factory: () => T): T => {
  const valueRef = useRef<T | undefined>(undefined);
  const initializedRef = useRef(false);
  
  if (!initializedRef.current) {
    valueRef.current = factory();
    initializedRef.current = true;
  }
  
  return valueRef.current!;
};

/**
 * Hook for batching state updates
 */
export const useBatchedUpdates = <T>(
  initialState: T,
  batchDelay = 16 // One frame at 60fps
) => {
  const [state, setState] = useState(initialState);
  const pendingUpdatesRef = useRef<((prev: T) => T)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const batchedSetState = useCallback((updater: (prev: T) => T) => {
    pendingUpdatesRef.current.push(updater);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        let newState = prevState;
        pendingUpdatesRef.current.forEach(update => {
          newState = update(newState);
        });
        pendingUpdatesRef.current = [];
        return newState;
      });
      timeoutRef.current = null;
    }, batchDelay);
  }, [batchDelay]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return [state, batchedSetState] as const;
};

/**
 * Hook for virtual scrolling optimization
 */
export const useVirtualization = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
      .map((item, index) => ({
        item,
        index: visibleRange.startIndex + index
      }));
  }, [items, visibleRange]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  };
};

/**
 * Hook for intersection observer (lazy loading)
 */
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        ...options
      }
    );
    
    observer.observe(target);
    
    return () => {
      observer.unobserve(target);
    };
  }, [options, hasIntersected]);
  
  return {
    targetRef,
    isIntersecting,
    hasIntersected
  };
};

/**
 * Hook for performance monitoring
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  
  useEffect(() => {
    renderCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} rendered ${renderCountRef.current} times. Time since last render: ${timeSinceLastRender}ms`);
    }
    
    lastRenderTimeRef.current = now;
  });
  
  const measurePerformance = useCallback((operationName: string, operation: () => void) => {
    const start = performance.now();
    operation();
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName}.${operationName} took ${end - start}ms`);
    }
  }, [componentName]);
  
  return {
    renderCount: renderCountRef.current,
    measurePerformance
  };
};

/**
 * Utility for creating memoized selectors
 */
export const createMemoizedSelector = <TState, TResult>(
  selector: (state: TState) => TResult,
  equalityFn?: (a: TResult, b: TResult) => boolean
) => {
  let lastState: TState;
  let lastResult: TResult;
  let hasResult = false;
  
  return (state: TState): TResult => {
    if (!hasResult || state !== lastState) {
      const newResult = selector(state);
      
      if (!hasResult || !equalityFn || !equalityFn(lastResult, newResult)) {
        lastResult = newResult;
      }
      
      lastState = state;
      hasResult = true;
    }
    
    return lastResult;
  };
};

/**
 * Hook for optimizing re-renders with shallow comparison
 */
export const useShallowMemo = <T extends Record<string, any>>(
  obj: T
): T => {
  const prevRef = useRef<T>(obj);
  
  return useMemo(() => {
    const prev = prevRef.current;
    const keys = Object.keys(obj);
    const prevKeys = Object.keys(prev);
    
    if (keys.length !== prevKeys.length) {
      prevRef.current = obj;
      return obj;
    }
    
    for (const key of keys) {
      if (obj[key] !== prev[key]) {
        prevRef.current = obj;
        return obj;
      }
    }
    
    return prev;
  }, [obj]);
};