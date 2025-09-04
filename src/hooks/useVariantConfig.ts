import { useMemo } from 'react';

// Base variant types
export type VariantType = 'standard' | 'ios' | 'enhanced';

interface BaseVariant {
  type: VariantType;
}

// Configuration interfaces
interface UIConfig {
  showAdvancedFeatures: boolean;
  useIOSOptimizations: boolean;
  enableAnimations: boolean;
  showFloatingActions: boolean;
  useBottomSheets: boolean;
  usePullToRefresh: boolean;
  showContextualHeaders: boolean;
  useGlassEffects: boolean;
}

interface FeatureConfig {
  enableBulkActions: boolean;
  enableAdvancedSearch: boolean;
  enableFilters: boolean;
  enableSorting: boolean;
  enableExport: boolean;
  enableImport: boolean;
  enableRealTimeUpdates: boolean;
  enableOfflineMode: boolean;
}

interface PerformanceConfig {
  enableVirtualization: boolean;
  enableLazyLoading: boolean;
  enableMemoization: boolean;
  debounceDelay: number;
  batchSize: number;
}

interface StyleConfig {
  containerClassName: string;
  cardClassName: string;
  headerClassName: string;
  actionClassName: string;
}

export interface VariantConfig {
  ui: UIConfig;
  features: FeatureConfig;
  performance: PerformanceConfig;
  styles: StyleConfig;
}

/**
 * Default configurations for each variant
 */
const VARIANT_CONFIGS: Record<VariantType, VariantConfig> = {
  standard: {
    ui: {
      showAdvancedFeatures: false,
      useIOSOptimizations: false,
      enableAnimations: false,
      showFloatingActions: false,
      useBottomSheets: false,
      usePullToRefresh: false,
      showContextualHeaders: false,
      useGlassEffects: false
    },
    features: {
      enableBulkActions: false,
      enableAdvancedSearch: false,
      enableFilters: true,
      enableSorting: false,
      enableExport: false,
      enableImport: false,
      enableRealTimeUpdates: true,
      enableOfflineMode: false
    },
    performance: {
      enableVirtualization: false,
      enableLazyLoading: false,
      enableMemoization: true,
      debounceDelay: 300,
      batchSize: 20
    },
    styles: {
      containerClassName: 'space-y-4',
      cardClassName: 'bg-card border rounded-lg p-4',
      headerClassName: 'flex items-center justify-between mb-4',
      actionClassName: 'flex gap-2'
    }
  },
  ios: {
    ui: {
      showAdvancedFeatures: false,
      useIOSOptimizations: true,
      enableAnimations: true,
      showFloatingActions: false,
      useBottomSheets: false,
      usePullToRefresh: true,
      showContextualHeaders: true,
      useGlassEffects: true
    },
    features: {
      enableBulkActions: false,
      enableAdvancedSearch: true,
      enableFilters: true,
      enableSorting: true,
      enableExport: true,
      enableImport: false,
      enableRealTimeUpdates: true,
      enableOfflineMode: true
    },
    performance: {
      enableVirtualization: true,
      enableLazyLoading: true,
      enableMemoization: true,
      debounceDelay: 200,
      batchSize: 15
    },
    styles: {
      containerClassName: 'ios-container space-y-3',
      cardClassName: 'ios-card backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-4',
      headerClassName: 'ios-header sticky top-0 z-10 backdrop-blur-md bg-white/80',
      actionClassName: 'ios-actions flex gap-3'
    }
  },
  enhanced: {
    ui: {
      showAdvancedFeatures: true,
      useIOSOptimizations: false,
      enableAnimations: true,
      showFloatingActions: true,
      useBottomSheets: true,
      usePullToRefresh: true,
      showContextualHeaders: false,
      useGlassEffects: false
    },
    features: {
      enableBulkActions: true,
      enableAdvancedSearch: true,
      enableFilters: true,
      enableSorting: true,
      enableExport: true,
      enableImport: true,
      enableRealTimeUpdates: true,
      enableOfflineMode: false
    },
    performance: {
      enableVirtualization: true,
      enableLazyLoading: true,
      enableMemoization: true,
      debounceDelay: 150,
      batchSize: 50
    },
    styles: {
      containerClassName: 'enhanced-container space-y-4',
      cardClassName: 'enhanced-card bg-card border rounded-lg p-4 hover:shadow-md transition-shadow',
      headerClassName: 'enhanced-header flex items-center justify-between mb-6 sticky top-0 z-10 bg-background/80 backdrop-blur-sm',
      actionClassName: 'enhanced-actions flex gap-2 flex-wrap'
    }
  }
};

/**
 * Hook to get variant-specific configuration
 */
export const useVariantConfig = <T extends BaseVariant>(
  variant: T,
  overrides?: Partial<VariantConfig>
): VariantConfig => {
  return useMemo(() => {
    const baseConfig = VARIANT_CONFIGS[variant.type];
    
    if (!overrides) {
      return baseConfig;
    }

    // Deep merge overrides
    return {
      ui: { ...baseConfig.ui, ...overrides.ui },
      features: { ...baseConfig.features, ...overrides.features },
      performance: { ...baseConfig.performance, ...overrides.performance },
      styles: { ...baseConfig.styles, ...overrides.styles }
    };
  }, [variant.type, overrides]);
};

/**
 * Utility functions for variant checking
 */
export const isIOSVariant = (variant: BaseVariant): boolean => {
  return variant.type === 'ios';
};

export const isEnhancedVariant = (variant: BaseVariant): boolean => {
  return variant.type === 'enhanced';
};

export const isStandardVariant = (variant: BaseVariant): boolean => {
  return variant.type === 'standard';
};

/**
 * Get conditional class names based on variant
 */
export const getVariantClassName = (
  variant: BaseVariant,
  baseClassName: string,
  variantClasses: Partial<Record<VariantType, string>> = {}
): string => {
  const variantClass = variantClasses[variant.type] || '';
  return `${baseClassName} ${variantClass}`.trim();
};

/**
 * Hook for conditional feature flags
 */
export const useFeatureFlag = (
  variant: BaseVariant,
  feature: keyof FeatureConfig
): boolean => {
  const config = useVariantConfig(variant);
  return config.features[feature];
};

/**
 * Hook for conditional UI flags
 */
export const useUIFlag = (
  variant: BaseVariant,
  uiFeature: keyof UIConfig
): boolean => {
  const config = useVariantConfig(variant);
  return config.ui[uiFeature];
};