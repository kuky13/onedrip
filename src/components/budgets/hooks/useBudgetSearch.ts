
import { useState, useMemo, useCallback, useEffect } from 'react';

// Custom debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useBudgetSearch = (budgets: any[] = []) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounce search term for real-time search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Enhanced search function with more fields and better matching
  const filteredBudgets = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      setIsSearching(false);
      return budgets;
    }
    
    setIsSearching(true);
    const term = debouncedSearchTerm.toLowerCase().trim();
    
    const filtered = budgets.filter(budget => {
      try {
        // Search fields
        const clientName = budget?.client_name || '';
        const deviceModel = budget?.device_model || '';
        const issue = budget?.issue || '';
        const description = budget?.description || '';
        const status = budget?.status || '';
        const id = budget?.id?.toString() || '';
        
        // Create searchable text combining all fields
        const searchableText = [
          clientName,
          deviceModel,
          issue,
          description,
          status
        ].join(' ').toLowerCase();
        
        // Multiple search strategies
        const exactMatch = searchableText.includes(term);
        const wordMatch = term.split(' ').every(word => 
          word.trim() && searchableText.includes(word.trim())
        );
        const idMatch = id.includes(term);
        
        return exactMatch || wordMatch || idMatch;
      } catch (error) {
        console.warn('Search filter error:', error);
        return false;
      }
    });
    
    setIsSearching(false);
    return filtered;
  }, [budgets, debouncedSearchTerm]);

  // Enhanced search term setter with immediate feedback
  const handleSearchTermChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      setIsSearching(true);
    }
  }, []);

  const handleSearch = useCallback(() => {
    // Force immediate search if needed
    if (searchTerm.trim()) {
      setIsSearching(true);
    }
  }, [searchTerm]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      clearSearch();
    }
  }, [handleSearch]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setIsSearching(false);
  }, []);

  // Search statistics
  const searchStats = useMemo(() => {
    const totalBudgets = budgets.length;
    const filteredCount = filteredBudgets.length;
    const hasActiveSearch = !!debouncedSearchTerm.trim();
    
    return {
      total: totalBudgets,
      filtered: filteredCount,
      hasResults: filteredCount > 0,
      hasActiveSearch,
      percentage: totalBudgets > 0 ? Math.round((filteredCount / totalBudgets) * 100) : 0
    };
  }, [budgets.length, filteredBudgets.length, debouncedSearchTerm]);

  return {
    searchTerm,
    setSearchTerm: handleSearchTermChange,
    debouncedSearchTerm,
    filteredBudgets,
    isSearching,
    handleSearch,
    handleKeyPress,
    clearSearch,
    searchStats,
    hasActiveSearch: searchStats.hasActiveSearch
  };
};
