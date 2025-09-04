import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from './useDebounce';

interface SearchState {
  searchTerm: string;
  debouncedSearchTerm: string;
  isSearching: boolean;
  isSearchActive: boolean;
}

interface SearchConfig {
  debounceDelay?: number;
  minSearchLength?: number;
  autoSubmit?: boolean;
  validateInput?: (input: string) => boolean;
}

interface SearchHandlers {
  handleSearchChange: (value: string) => void;
  handleSearchSubmit: (value?: string) => Promise<void>;
  handleSearchClear: () => void;
  handleSearchToggle: () => void;
  setIsSearching: (isSearching: boolean) => void;
}

/**
 * Shared hook for search functionality with debounce
 * Provides consistent search behavior across components
 */
export const useSearchWithDebounce = (
  onSearch: (searchTerm: string) => Promise<void> | void,
  config: SearchConfig = {}
): SearchState & SearchHandlers => {
  const {
    debounceDelay = 300,
    minSearchLength = 0,
    autoSubmit = true,
    validateInput = (input: string) => {
      // Basic XSS protection
      return !input.includes('<script') && !input.includes('javascript:');
    }
  } = config;

  const [state, setState] = useState<SearchState>({
    searchTerm: '',
    debouncedSearchTerm: '',
    isSearching: false,
    isSearchActive: false
  });

  const debouncedSearchTerm = useDebounce(state.searchTerm, debounceDelay);

  // Update debounced term in state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      debouncedSearchTerm: debouncedSearchTerm
    }));
  }, [debouncedSearchTerm]);

  // Auto-submit when debounced term changes
  useEffect(() => {
    if (autoSubmit && debouncedSearchTerm !== state.searchTerm) {
      const trimmed = debouncedSearchTerm.trim();
      if (trimmed.length >= minSearchLength) {
        handleSearchSubmit(trimmed);
      } else if (trimmed.length === 0) {
        // Clear search when empty
        onSearch('');
      }
    }
  }, [debouncedSearchTerm, autoSubmit, minSearchLength]);

  const handleSearchChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      searchTerm: value
    }));
  }, []);

  const handleSearchSubmit = useCallback(async (value?: string) => {
    const searchValue = value ?? state.searchTerm;
    const trimmedValue = searchValue.trim();
    
    if (!trimmedValue) {
      await onSearch('');
      return;
    }

    if (trimmedValue.length < minSearchLength) {
      return;
    }

    if (!validateInput(trimmedValue)) {
      console.warn('Invalid search input blocked');
      return;
    }

    setState(prev => ({ ...prev, isSearching: true }));
    
    try {
      await onSearch(trimmedValue);
    } finally {
      setState(prev => ({ ...prev, isSearching: false }));
    }
  }, [state.searchTerm, minSearchLength, validateInput, onSearch]);

  const handleSearchClear = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchTerm: '',
      debouncedSearchTerm: '',
      isSearchActive: false
    }));
    onSearch('');
  }, [onSearch]);

  const handleSearchToggle = useCallback(() => {
    setState(prev => {
      const newIsActive = !prev.isSearchActive;
      if (!newIsActive) {
        // Clear search when closing
        onSearch('');
        return {
          ...prev,
          isSearchActive: false,
          searchTerm: '',
          debouncedSearchTerm: ''
        };
      }
      return {
        ...prev,
        isSearchActive: true
      };
    });
  }, [onSearch]);

  const setIsSearching = useCallback((isSearching: boolean) => {
    setState(prev => ({ ...prev, isSearching }));
  }, []);

  return {
    ...state,
    handleSearchChange,
    handleSearchSubmit,
    handleSearchClear,
    handleSearchToggle,
    setIsSearching
  };
};

/**
 * Simplified search hook for basic use cases
 */
export const useSimpleSearch = (
  onSearch: (searchTerm: string) => void,
  debounceDelay = 300
) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, debounceDelay);

  useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  const handleClear = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    handleClear
  };
};