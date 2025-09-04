import { useState, useCallback, useMemo } from 'react';

// Generic filter types
export interface FilterOption {
  key: string;
  label: string;
  value: any;
  count?: number;
}

export interface FilterGroup {
  key: string;
  label: string;
  type: 'single' | 'multiple' | 'range' | 'date';
  options?: FilterOption[];
  defaultValue?: any;
}

export interface ActiveFilter {
  groupKey: string;
  value: any;
  label?: string;
}

interface FilterState {
  activeFilters: Record<string, any>;
  isFilterPanelOpen: boolean;
}

interface FilterHandlers {
  setFilter: (groupKey: string, value: any) => void;
  removeFilter: (groupKey: string) => void;
  clearAllFilters: () => void;
  toggleFilterPanel: () => void;
  setFilterPanelOpen: (open: boolean) => void;
  getActiveFilterCount: () => number;
  getActiveFilterLabels: () => ActiveFilter[];
  hasActiveFilters: () => boolean;
}

/**
 * Shared hook for managing filters across components
 */
export const useFilterManager = (
  filterGroups: FilterGroup[],
  onFiltersChange?: (filters: Record<string, any>) => void
): FilterState & FilterHandlers => {
  const [state, setState] = useState<FilterState>(() => {
    // Initialize with default values
    const initialFilters: Record<string, any> = {};
    filterGroups.forEach(group => {
      if (group.defaultValue !== undefined) {
        initialFilters[group.key] = group.defaultValue;
      }
    });
    
    return {
      activeFilters: initialFilters,
      isFilterPanelOpen: false
    };
  });

  const setFilter = useCallback((groupKey: string, value: any) => {
    setState(prev => {
      const newFilters = {
        ...prev.activeFilters,
        [groupKey]: value
      };
      
      // Remove filter if value is null/undefined/empty
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        delete newFilters[groupKey];
      }
      
      onFiltersChange?.(newFilters);
      
      return {
        ...prev,
        activeFilters: newFilters
      };
    });
  }, [onFiltersChange]);

  const removeFilter = useCallback((groupKey: string) => {
    setState(prev => {
      const newFilters = { ...prev.activeFilters };
      delete newFilters[groupKey];
      
      onFiltersChange?.(newFilters);
      
      return {
        ...prev,
        activeFilters: newFilters
      };
    });
  }, [onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    setState(prev => {
      onFiltersChange?.({});
      
      return {
        ...prev,
        activeFilters: {}
      };
    });
  }, [onFiltersChange]);

  const toggleFilterPanel = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFilterPanelOpen: !prev.isFilterPanelOpen
    }));
  }, []);

  const setFilterPanelOpen = useCallback((open: boolean) => {
    setState(prev => ({
      ...prev,
      isFilterPanelOpen: open
    }));
  }, []);

  const getActiveFilterCount = useCallback(() => {
    return Object.keys(state.activeFilters).length;
  }, [state.activeFilters]);

  const getActiveFilterLabels = useCallback((): ActiveFilter[] => {
    return Object.entries(state.activeFilters).map(([groupKey, value]) => {
      const group = filterGroups.find(g => g.key === groupKey);
      let label = `${group?.label || groupKey}: ${value}`;
      
      // Try to find option label
      if (group?.options) {
        const option = group.options.find(opt => opt.value === value);
        if (option) {
          label = `${group.label}: ${option.label}`;
        }
      }
      
      return {
        groupKey,
        value,
        label
      };
    });
  }, [state.activeFilters, filterGroups]);

  const hasActiveFilters = useCallback(() => {
    return Object.keys(state.activeFilters).length > 0;
  }, [state.activeFilters]);

  return {
    ...state,
    setFilter,
    removeFilter,
    clearAllFilters,
    toggleFilterPanel,
    setFilterPanelOpen,
    getActiveFilterCount,
    getActiveFilterLabels,
    hasActiveFilters
  };
};

/**
 * Hook for applying filters to data
 */
export const useDataFilter = <T>(
  data: T[],
  filters: Record<string, any>,
  filterFunctions: Record<string, (item: T, value: any) => boolean>
): T[] => {
  return useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }

    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        const filterFn = filterFunctions[key];
        if (!filterFn) {
          console.warn(`No filter function found for key: ${key}`);
          return true;
        }
        return filterFn(item, value);
      });
    });
  }, [data, filters, filterFunctions]);
};

/**
 * Common filter functions for typical use cases
 */
export const commonFilterFunctions = {
  // Text search filter
  textSearch: <T>(searchFields: (keyof T)[]) => 
    (item: T, searchTerm: string): boolean => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return searchFields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(term);
      });
    },

  // Exact match filter
  exactMatch: <T>(field: keyof T) => 
    (item: T, value: any): boolean => {
      if (value === null || value === undefined) return true;
      return item[field] === value;
    },

  // Array contains filter
  arrayContains: <T>(field: keyof T) => 
    (item: T, values: any[]): boolean => {
      if (!values || values.length === 0) return true;
      const itemValue = item[field];
      return values.includes(itemValue);
    },

  // Date range filter
  dateRange: <T>(field: keyof T) => 
    (item: T, range: { start?: Date; end?: Date }): boolean => {
      if (!range.start && !range.end) return true;
      const itemDate = new Date(item[field] as any);
      if (range.start && itemDate < range.start) return false;
      if (range.end && itemDate > range.end) return false;
      return true;
    },

  // Number range filter
  numberRange: <T>(field: keyof T) => 
    (item: T, range: { min?: number; max?: number }): boolean => {
      if (range.min === undefined && range.max === undefined) return true;
      const itemValue = Number(item[field]);
      if (range.min !== undefined && itemValue < range.min) return false;
      if (range.max !== undefined && itemValue > range.max) return false;
      return true;
    },

  // Boolean filter
  boolean: <T>(field: keyof T) => 
    (item: T, value: boolean): boolean => {
      if (value === null || value === undefined) return true;
      return Boolean(item[field]) === value;
    }
};