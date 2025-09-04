import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDeviceDetection, useBreakpoint, useDeviceCapabilities } from '../../hooks/useDeviceDetection';

// Mock do window.matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock do navigator
const mockNavigator = {
  userAgent: '',
  maxTouchPoints: 0,
  platform: 'Win32'
};
Object.defineProperty(window, 'navigator', {
  writable: true,
  value: mockNavigator,
});

// Mock do window.screen
const mockScreen = {
  width: 1920,
  height: 1080,
  orientation: {
    type: 'landscape-primary'
  }
};
Object.defineProperty(window, 'screen', {
  writable: true,
  value: mockScreen,
});

// Mock do devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 1,
});

// Mock do window.innerWidth e innerHeight
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  value: 1920,
});
Object.defineProperty(window, 'innerHeight', {
  writable: true,
  value: 1080,
});

describe('useDeviceDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default matchMedia mock
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Desktop Detection', () => {
    beforeEach(() => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      mockNavigator.maxTouchPoints = 0;
      mockNavigator.platform = 'Win32';
      window.innerWidth = 1920;
      window.innerHeight = 1080;
      
      mockMatchMedia.mockImplementation((query: string) => {
        const matches = {
          '(min-width: 1024px)': true,
          '(max-width: 767px)': false,
          '(max-width: 1023px)': false,
          '(hover: hover)': true,
          '(pointer: fine)': true,
          '(prefers-reduced-motion: reduce)': false,
          '(prefers-color-scheme: dark)': false
        };
        
        return {
          matches: matches[query as keyof typeof matches] || false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });
    });

    it('should detect desktop device correctly', () => {
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.deviceType).toBe('desktop');
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.platform).toBe('Windows');
      expect(result.current.hasHover).toBe(true);
      expect(result.current.hasTouch).toBe(false);
    });

    it('should detect screen size correctly', () => {
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.screenSize.width).toBe(1920);
      expect(result.current.screenSize.height).toBe(1080);
      expect(result.current.orientation).toBe('landscape');
    });
  });

  describe('Mobile Detection', () => {
    beforeEach(() => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15';
      mockNavigator.maxTouchPoints = 5;
      mockNavigator.platform = 'iPhone';
      window.innerWidth = 375;
      window.innerHeight = 812;
      
      mockMatchMedia.mockImplementation((query: string) => {
        const matches = {
          '(min-width: 1024px)': false,
          '(max-width: 767px)': true,
          '(max-width: 1023px)': true,
          '(hover: hover)': false,
          '(pointer: fine)': false,
          '(prefers-reduced-motion: reduce)': false,
          '(prefers-color-scheme: dark)': false
        };
        
        return {
          matches: matches[query as keyof typeof matches] || false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });
    });

    it('should detect mobile device correctly', () => {
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.deviceType).toBe('mobile');
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.platform).toBe('iOS');
      expect(result.current.hasHover).toBe(false);
      expect(result.current.hasTouch).toBe(true);
    });

    it('should detect portrait orientation', () => {
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.orientation).toBe('portrait');
    });
  });

  describe('Tablet Detection', () => {
    beforeEach(() => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15';
      mockNavigator.maxTouchPoints = 5;
      mockNavigator.platform = 'iPad';
      window.innerWidth = 768;
      window.innerHeight = 1024;
      
      mockMatchMedia.mockImplementation((query: string) => {
        const matches = {
          '(min-width: 1024px)': false,
          '(max-width: 767px)': false,
          '(max-width: 1023px)': true,
          '(hover: hover)': false,
          '(pointer: fine)': false,
          '(prefers-reduced-motion: reduce)': false,
          '(prefers-color-scheme: dark)': false
        };
        
        return {
          matches: matches[query as keyof typeof matches] || false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });
    });

    it('should detect tablet device correctly', () => {
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.deviceType).toBe('tablet');
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.platform).toBe('iOS');
    });
  });

  describe('Android Detection', () => {
    beforeEach(() => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36';
      mockNavigator.maxTouchPoints = 5;
      mockNavigator.platform = 'Linux armv7l';
    });

    it('should detect Android platform correctly', () => {
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.platform).toBe('Android');
    });
  });

  describe('Accessibility Preferences', () => {
    it('should detect reduced motion preference', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        const matches = {
          '(prefers-reduced-motion: reduce)': true
        };
        
        return {
          matches: matches[query as keyof typeof matches] || false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.prefersReducedMotion).toBe(true);
    });

    it('should detect dark color scheme preference', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        const matches = {
          '(prefers-color-scheme: dark)': true
        };
        
        return {
          matches: matches[query as keyof typeof matches] || false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.colorScheme).toBe('dark');
    });
  });
});

describe('useBreakpoint', () => {
  beforeEach(() => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('should return correct breakpoint status', () => {
    const { result } = renderHook(() => useBreakpoint('md'));
    
    expect(result.current).toBe(true);
  });
});

describe('useDeviceCapabilities', () => {
  beforeEach(() => {
    mockNavigator.maxTouchPoints = 5;
    
    mockMatchMedia.mockImplementation((query: string) => {
      const matches = {
        '(hover: hover)': false,
        '(pointer: fine)': false
      };
      
      return {
        matches: matches[query as keyof typeof matches] || false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });
  });

  it('should detect device capabilities correctly', () => {
    const { result } = renderHook(() => useDeviceCapabilities());
    
    expect(result.current.hasTouch).toBe(true);
    expect(result.current.hasHover).toBe(false);
    expect(result.current.hasFinePointer).toBe(false);
  });
});