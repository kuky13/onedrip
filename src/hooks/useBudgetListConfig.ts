import { useMemo } from 'react';

type BudgetListVariant = {
  type: 'standard' | 'ios' | 'enhanced';
};

interface BudgetListConfig {
  // UI Configuration
  showSearch: boolean;
  showFilters: boolean;
  showSorting: boolean;
  showPullToRefresh: boolean;
  showFloatingActionButton: boolean;
  showBottomSheet: boolean;
  showIOSOptimizations: boolean;
  showAnimations: boolean;
  showToasts: boolean;
  
  // Data Configuration
  useRealTimeSubscription: boolean;
  useDebounceRefresh: boolean;
  useSoftDelete: boolean;
  useAdvancedSearch: boolean;
  
  // Component Configuration
  cardComponent: 'standard' | 'ios' | 'enhanced';
  searchComponent: 'standard' | 'universal';
  headerComponent: 'none' | 'ios' | 'enhanced';
  
  // Feature Configuration
  enablePDFGeneration: boolean;
  enableWhatsAppSharing: boolean;
  enableBulkActions: boolean;
  enableStatusFilters: boolean;
  
  // Performance Configuration
  enableVirtualization: boolean;
  enableLazyLoading: boolean;
  maxItemsPerPage: number;
  
  // Style Configuration
  containerClassName: string;
  itemSpacing: string;
  loadingComponent: 'skeleton' | 'spinner' | 'advanced';
}

export const useBudgetListConfig = (variant: BudgetListVariant): BudgetListConfig => {
  return useMemo(() => {
    const baseConfig: BudgetListConfig = {
      // UI Configuration
      showSearch: true,
      showFilters: false,
      showSorting: false,
      showPullToRefresh: false,
      showFloatingActionButton: false,
      showBottomSheet: false,
      showIOSOptimizations: false,
      showAnimations: false,
      showToasts: false,
      
      // Data Configuration
      useRealTimeSubscription: true,
      useDebounceRefresh: true,
      useSoftDelete: false,
      useAdvancedSearch: false,
      
      // Component Configuration
      cardComponent: 'standard',
      searchComponent: 'standard',
      headerComponent: 'none',
      
      // Feature Configuration
      enablePDFGeneration: false,
      enableWhatsAppSharing: true,
      enableBulkActions: false,
      enableStatusFilters: false,
      
      // Performance Configuration
      enableVirtualization: false,
      enableLazyLoading: false,
      maxItemsPerPage: 50,
      
      // Style Configuration
      containerClassName: 'p-4',
      itemSpacing: 'space-y-3',
      loadingComponent: 'skeleton'
    };

    switch (variant.type) {
      case 'ios':
        return {
          ...baseConfig,
          // UI Configuration
          showPullToRefresh: false, // Handled by IOSContextualHeaderEnhanced
          showIOSOptimizations: true,
          showAnimations: true,
          
          // Data Configuration
          useSoftDelete: true,
          
          // Component Configuration
          cardComponent: 'ios',
          searchComponent: 'standard', // Handled by IOSContextualHeaderEnhanced
          headerComponent: 'ios',
          
          // Feature Configuration
          enablePDFGeneration: true,
          
          // Style Configuration
          containerClassName: 'min-h-[100dvh] bg-background text-foreground',
          itemSpacing: 'space-y-4',
          loadingComponent: 'advanced'
        };

      case 'enhanced':
        return {
          ...baseConfig,
          // UI Configuration
          showFilters: true,
          showSorting: true,
          showPullToRefresh: true,
          showFloatingActionButton: true,
          showBottomSheet: true,
          showIOSOptimizations: true,
          showAnimations: true,
          showToasts: true,
          
          // Data Configuration
          useAdvancedSearch: true,
          
          // Component Configuration
          cardComponent: 'enhanced',
          searchComponent: 'universal',
          headerComponent: 'enhanced',
          
          // Feature Configuration
          enablePDFGeneration: true,
          enableBulkActions: true,
          enableStatusFilters: true,
          
          // Performance Configuration
          enableLazyLoading: true,
          maxItemsPerPage: 20,
          
          // Style Configuration
          containerClassName: 'min-h-screen bg-background',
          itemSpacing: 'space-y-4',
          loadingComponent: 'skeleton'
        };

      case 'standard':
      default:
        return baseConfig;
    }
  }, [variant.type]);
};

// Helper function to get variant-specific class names
export const getBudgetListClasses = (variant: BudgetListVariant) => {
  const config = useBudgetListConfig(variant);
  
  return {
    container: config.containerClassName,
    itemSpacing: config.itemSpacing,
    searchContainer: variant.type === 'enhanced' ? 'sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/30' : '',
    contentContainer: variant.type === 'enhanced' ? 'p-4 pb-24' : variant.type === 'ios' ? 'px-4 py-6' : 'space-y-3'
  };
};

// Helper function to determine which hooks to use
export const getBudgetListHooks = (variant: BudgetListVariant) => {
  const config = useBudgetListConfig(variant);
  
  return {
    useAuth: variant.type !== 'standard',
    useBudgetData: variant.type !== 'standard',
    useIOSToast: config.showToasts,
    useBudgetDeletion: variant.type === 'standard',
    useToast: variant.type !== 'enhanced'
  };
};

// Helper function to get feature flags
export const getBudgetListFeatures = (variant: BudgetListVariant) => {
  const config = useBudgetListConfig(variant);
  
  return {
    hasRealTimeUpdates: config.useRealTimeSubscription,
    hasAdvancedSearch: config.useAdvancedSearch,
    hasFilters: config.showFilters,
    hasSorting: config.showSorting,
    hasPullToRefresh: config.showPullToRefresh,
    hasFAB: config.showFloatingActionButton,
    hasBottomSheet: config.showBottomSheet,
    hasAnimations: config.showAnimations,
    hasIOSOptimizations: config.showIOSOptimizations,
    hasPDFGeneration: config.enablePDFGeneration,
    hasWhatsAppSharing: config.enableWhatsAppSharing,
    hasBulkActions: config.enableBulkActions,
    hasStatusFilters: config.enableStatusFilters,
    hasSoftDelete: config.useSoftDelete
  };
};