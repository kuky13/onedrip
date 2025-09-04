import { useState, useEffect, useRef, useCallback } from 'react';
import { useIntersectionObserver } from './usePerformanceOptimization';

/**
 * Hook for lazy loading components
 */
export const useLazyComponent = <T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedRef = useRef(false);

  const loadComponent = useCallback(async () => {
    if (loadedRef.current || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const module = await importFn();
      setComponent(module.default);
      loadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load component'));
    } finally {
      setLoading(false);
    }
  }, [importFn, loading]);

  return {
    Component,
    loading,
    error,
    loadComponent,
    isLoaded: loadedRef.current
  };
};

/**
 * Hook for lazy loading with intersection observer
 */
export const useLazyComponentWithIntersection = <T>(
  importFn: () => Promise<{ default: T }>,
  options?: IntersectionObserverInit
) => {
  const { Component, loading, error, loadComponent, isLoaded } = useLazyComponent(importFn);
  const { targetRef, isIntersecting, hasIntersected } = useIntersectionObserver(options);

  useEffect(() => {
    if (hasIntersected && !isLoaded && !loading) {
      loadComponent();
    }
  }, [hasIntersected, isLoaded, loading, loadComponent]);

  return {
    Component,
    loading,
    error,
    targetRef,
    isIntersecting,
    hasIntersected,
    isLoaded
  };
};

/**
 * Hook for lazy loading data
 */
export const useLazyData = <T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    if (loadedRef.current || loading) return;
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn();
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      setData(result);
      loadedRef.current = true;
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchFn, loading]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setData(null);
    setLoading(false);
    setError(null);
    loadedRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    loadData,
    reset,
    isLoaded: loadedRef.current
  };
};

/**
 * Hook for lazy loading data with intersection observer
 */
export const useLazyDataWithIntersection = <T>(
  fetchFn: () => Promise<T>,
  options?: IntersectionObserverInit,
  deps: React.DependencyList = []
) => {
  const { data, loading, error, loadData, reset, isLoaded } = useLazyData(fetchFn, deps);
  const { targetRef, isIntersecting, hasIntersected } = useIntersectionObserver(options);

  useEffect(() => {
    if (hasIntersected && !isLoaded && !loading) {
      loadData();
    }
  }, [hasIntersected, isLoaded, loading, loadData]);

  return {
    data,
    loading,
    error,
    targetRef,
    isIntersecting,
    hasIntersected,
    isLoaded,
    reset
  };
};

/**
 * Hook for preloading resources
 */
export const usePreloader = () => {
  const preloadedRef = useRef<Set<string>>(new Set());

  const preloadComponent = useCallback(async (importFn: () => Promise<any>) => {
    const key = importFn.toString();
    if (preloadedRef.current.has(key)) return;
    
    try {
      await importFn();
      preloadedRef.current.add(key);
    } catch (err) {
      console.warn('Failed to preload component:', err);
    }
  }, []);

  const preloadImage = useCallback((src: string): Promise<void> => {
    if (preloadedRef.current.has(src)) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        preloadedRef.current.add(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const preloadFont = useCallback((fontFamily: string, src: string): Promise<void> => {
    const key = `font-${fontFamily}`;
    if (preloadedRef.current.has(key)) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const font = new FontFace(fontFamily, `url(${src})`);
      font.load().then(() => {
        document.fonts.add(font);
        preloadedRef.current.add(key);
        resolve();
      }).catch(reject);
    });
  }, []);

  return {
    preloadComponent,
    preloadImage,
    preloadFont,
    isPreloaded: (key: string) => preloadedRef.current.has(key)
  };
};

/**
 * Hook for progressive image loading
 */
export const useProgressiveImage = (src: string, placeholder?: string) => {
  const [currentSrc, setCurrentSrc] = useState(placeholder || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    
    setLoading(true);
    setError(false);
    
    const img = new Image();
    img.onload = () => {
      setCurrentSrc(src);
      setLoading(false);
    };
    img.onerror = () => {
      setError(true);
      setLoading(false);
    };
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return {
    src: