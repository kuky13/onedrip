import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOptimizedSearch, useDebounce, useSearchHistory } from '../../hooks/useOptimizedSearch';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

// Mock do hook useDeviceDetection
vi.mock('../../hooks/useDeviceDetection');
const mockUseDeviceDetection = vi.mocked(useDeviceDetection);

// Mock do localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Dados de teste
const mockBudgets = [
  {
    id: '1',
    title: 'Orçamento Website E-commerce',
    description: 'Desenvolvimento de loja virtual completa',
    client: 'João Silva',
    value: 15000,
    status: 'pending',
    created_at: '2024-01-15'
  },
  {
    id: '2',
    title: 'App Mobile iOS',
    description: 'Aplicativo nativo para iPhone',
    client: 'Maria Santos',
    value: 25000,
    status: 'approved',
    created_at: '2024-01-20'
  },
  {
    id: '3',
    title: 'Sistema de Gestão',
    description: 'ERP personalizado para empresa',
    client: 'Pedro Costa',
    value: 50000,
    status: 'completed',
    created_at: '2024-01-10'
  }
];

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    expect(result.current).toBe('initial');

    // Atualiza o valor
    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial'); // Ainda não mudou

    // Avança o tempo
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    // Múltiplas mudanças rápidas
    rerender({ value: 'change1', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: 'change2', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: 'final', delay: 500 });
    
    // Ainda deve ser o valor inicial
    expect(result.current).toBe('initial');

    // Avança o tempo completo
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('final');
  });
});

describe('useSearchHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useSearchHistory());
    
    expect(result.current.history).toEqual([]);
  });

  it('should load history from localStorage', () => {
    const savedHistory = ['busca1', 'busca2'];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedHistory));
    
    const { result } = renderHook(() => useSearchHistory());
    
    expect(result.current.history).toEqual(savedHistory);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('search-history');
  });

  it('should add search term to history', () => {
    const { result } = renderHook(() => useSearchHistory());
    
    act(() => {
      result.current.addToHistory('nova busca');
    });

    expect(result.current.history).toContain('nova busca');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'search-history',
      JSON.stringify(['nova busca'])
    );
  });

  it('should not add duplicate terms', () => {
    const { result } = renderHook(() => useSearchHistory());
    
    act(() => {
      result.current.addToHistory('busca');
      result.current.addToHistory('busca'); // Duplicata
    });

    expect(result.current.history).toEqual(['busca']);
  });

  it('should limit history size', () => {
    const { result } = renderHook(() => useSearchHistory());
    
    // Adiciona mais de 10 itens
    act(() => {
      for (let i = 1; i <= 12; i++) {
        result.current.addToHistory(`busca${i}`);
      }
    });

    expect(result.current.history).toHaveLength(10);
    expect(result.current.history[0]).toBe('busca12'); // Mais recente primeiro
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useSearchHistory());
    
    act(() => {
      result.current.addToHistory('busca');
      result.current.clearHistory();
    });

    expect(result.current.history).toEqual([]);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('search-history');
  });
});

describe('useOptimizedSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock padrão para desktop
    mockUseDeviceDetection.mockReturnValue({
      deviceType: 'desktop',
      platform: 'Windows',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenSize: { width: 1920, height: 1080 },
      pixelRatio: 1,
      orientation: 'landscape',
      hasTouch: false,
      hasHover: true,
      prefersReducedMotion: false,
      colorScheme: 'light'
    });

    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty search term', () => {
    const { result } = renderHook(() => 
      useOptimizedSearch(mockBudgets, { searchFields: ['title', 'description'] })
    );
    
    expect(result.current.searchTerm).toBe('');
  });

  it('should have search result with items', () => {
    const { result } = renderHook(() => 
      useOptimizedSearch(mockBudgets, { searchFields: ['title', 'description'] })
    );
    
    expect(result.current.searchResult).toBeDefined();
    expect(result.current.searchResult.items).toBeDefined();
  });

  it('should have options defined', () => {
    const { result } = renderHook(() => 
      useOptimizedSearch(mockBudgets, { searchFields: ['title', 'description'] })
    );
    
    expect(result.current.options).toBeDefined();
    expect(result.current.options.searchFields).toEqual(['title', 'description']);
  });

  it('should have clearSearch function', () => {
    const { result } = renderHook(() => 
      useOptimizedSearch(mockBudgets, { searchFields: ['title', 'description'] })
    );
    
    expect(typeof result.current.clearSearch).toBe('function');
  });

  it('should have updateOptions function', () => {
    const { result } = renderHook(() => 
      useOptimizedSearch(mockBudgets, { searchFields: ['title', 'description'] })
    );
    
    expect(typeof result.current.updateOptions).toBe('function');
  });
});