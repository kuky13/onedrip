
import { useState, useMemo, useCallback, useEffect } from 'react';
import { highlightObjectFields, calculateRelevanceScore, createSearchSnippet } from '@/utils/search-highlighting';

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
  const [searchPerformance, setSearchPerformance] = useState({
    searchTime: 0,
    totalResults: 0,
    filteredResults: 0,
    averageScore: 0
  });
  
  // Debounce search term for real-time search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Manage isSearching state safely
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [debouncedSearchTerm]);

  // Enhanced search function with highlighting and relevance scoring
  const filteredBudgets = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return budgets;
    }
    
    const term = debouncedSearchTerm.toLowerCase().trim();
    const startTime = performance.now();
    
    const searchResults = budgets
      .map(budget => {
        try {
          // Search fields with weights
          const searchFields = {
            client_name: { value: budget?.client_name || '', weight: 1.0 },
            device_model: { value: budget?.device_model || '', weight: 0.8 },
            issue: { value: budget?.issue || '', weight: 0.9 },
            description: { value: budget?.description || '', weight: 0.6 },
            status: { value: budget?.status || '', weight: 0.7 },
            id: { value: budget?.id?.toString() || '', weight: 1.2 }
          };
          
          // Calculate relevance score for each field
          let totalScore = 0;
          let hasMatch = false;
          
          for (const [fieldName, fieldData] of Object.entries(searchFields)) {
            const fieldScore = calculateRelevanceScore(
              fieldData.value,
              term,
              { fieldWeight: fieldData.weight, positionWeight: true }
            );
            
            if (fieldScore > 0) {
              totalScore += fieldScore;
              hasMatch = true;
            }
          }
          
          if (!hasMatch) return null;
          
          // Add highlighting to matched fields
          const highlightedBudget = highlightObjectFields(
            budget,
            debouncedSearchTerm,
            ['client_name', 'device_model', 'issue', 'description', 'status'],
            {
              highlightClass: 'bg-yellow-200 dark:bg-yellow-800/50 px-1 rounded font-medium text-yellow-900 dark:text-yellow-100'
            }
          );
          
          // Create search snippets for long descriptions
          const snippets: Record<string, string> = {};
          if (budget.description && budget.description.length > 100) {
            snippets.description = createSearchSnippet(budget.description, debouncedSearchTerm, 120);
          }
          if (budget.issue && budget.issue.length > 80) {
            snippets.issue = createSearchSnippet(budget.issue, debouncedSearchTerm, 100);
          }
          
          return {
            ...highlightedBudget,
            _searchMeta: {
              score: Math.min(totalScore, 1), // Normalize to 0-1
              snippets,
              matchedFields: Object.keys(searchFields).filter(field => 
                calculateRelevanceScore(searchFields[field as keyof typeof searchFields].value, term) > 0
              )
            }
          };
        } catch (error) {
          console.warn('Search filter error:', error);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Sort by relevance score (highest first)
        const scoreA = a?._searchMeta?.score || 0;
        const scoreB = b?._searchMeta?.score || 0;
        return scoreB - scoreA;
      });
    
    const endTime = performance.now();
    const searchTime = endTime - startTime;
    
    return searchResults;
  }, [budgets, debouncedSearchTerm]);

  // Update search performance after filtering
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      const startTime = performance.now();
      // Simulate search time calculation
      const endTime = performance.now();
      const searchTime = endTime - startTime;
      
      setSearchPerformance({
        searchTime,
        totalResults: budgets.length,
        filteredResults: filteredBudgets.length,
        averageScore: filteredBudgets.length > 0 
          ? filteredBudgets.reduce((sum, item) => sum + (item._searchMeta?.score || 0), 0) / filteredBudgets.length
          : 0
      });
      setIsSearching(false);
    }
  }, [budgets.length, filteredBudgets.length, debouncedSearchTerm]);

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

  // Enhanced search statistics with performance metrics
  const searchStats = useMemo(() => {
    const totalBudgets = budgets.length;
    const filteredCount = filteredBudgets.length;
    const hasActiveSearch = !!debouncedSearchTerm.trim();
    
    return {
      total: totalBudgets,
      filtered: filteredCount,
      hasResults: filteredCount > 0,
      hasActiveSearch,
      percentage: totalBudgets > 0 ? Math.round((filteredCount / totalBudgets) * 100) : 0,
      searchTime: searchPerformance.searchTime,
      averageRelevance: searchPerformance.averageScore,
      qualityIndicator: filteredCount === 0 ? 'none' :
                       filteredCount === totalBudgets ? 'all' :
                       filteredCount > totalBudgets * 0.7 ? 'most' :
                       filteredCount > totalBudgets * 0.3 ? 'some' : 'few'
    };
  }, [budgets.length, filteredBudgets.length, debouncedSearchTerm, searchPerformance]);

  // Helper function to get highlighted text for a specific field
  const getHighlightedText = useCallback((budget: any, field: string) => {
    return budget._highlighted?.[field] || budget[field] || '';
  }, []);
  
  // Helper function to get search snippet for a field
  const getSearchSnippet = useCallback((budget: any, field: string) => {
    return budget._searchMeta?.snippets?.[field] || budget[field] || '';
  }, []);
  
  // Helper function to get relevance score
  const getRelevanceScore = useCallback((budget: any) => {
    return budget._searchMeta?.score || 0;
  }, []);
  
  // Helper function to get matched fields
  const getMatchedFields = useCallback((budget: any) => {
    return budget._searchMeta?.matchedFields || [];
  }, []);

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
    hasActiveSearch: searchStats.hasActiveSearch,
    // New highlighting and relevance helpers
    getHighlightedText,
    getSearchSnippet,
    getRelevanceScore,
    getMatchedFields,
    searchPerformance
  };
};
