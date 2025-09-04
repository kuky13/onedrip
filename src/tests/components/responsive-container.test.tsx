import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResponsiveContainer, ResponsiveCard, ResponsiveSection, ResponsiveGrid, ResponsiveList } from '../../components/ui/responsive-container';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

// Mock do hook useDeviceDetection
vi.mock('../../hooks/useDeviceDetection');
const mockUseDeviceDetection = vi.mocked(useDeviceDetection);

// Mock do IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

describe('ResponsiveContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Desktop Device', () => {
    beforeEach(() => {
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
    });

    it('should render with desktop-optimized spacing', () => {
      render(
        <ResponsiveContainer data-testid="container">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('p-6', 'gap-6');
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should apply custom desktop spacing when provided', () => {
      render(
        <ResponsiveContainer 
          data-testid="container"
          desktopPadding="p-8"
          desktopGap="gap-8"
        >
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('p-8', 'gap-8');
    });
  });

  describe('Mobile Device', () => {
    beforeEach(() => {
      mockUseDeviceDetection.mockReturnValue({
        deviceType: 'mobile',
        platform: 'iOS',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        screenSize: { width: 375, height: 812 },
        pixelRatio: 3,
        orientation: 'portrait',
        hasTouch: true,
        hasHover: false,
        prefersReducedMotion: false,
        colorScheme: 'light'
      });
    });

    it('should render with mobile-optimized spacing', () => {
      render(
        <ResponsiveContainer data-testid="container">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('p-4', 'gap-4');
    });

    it('should apply mobile-specific flex direction', () => {
      render(
        <ResponsiveContainer 
          data-testid="container"
          mobileDirection="flex-col"
        >
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('flex-col');
    });
  });

  describe('Tablet Device', () => {
    beforeEach(() => {
      mockUseDeviceDetection.mockReturnValue({
        deviceType: 'tablet',
        platform: 'Android',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        screenSize: { width: 768, height: 1024 },
        pixelRatio: 2,
        orientation: 'portrait',
        hasTouch: true,
        hasHover: false,
        prefersReducedMotion: false,
        colorScheme: 'light'
      });
    });

    it('should render with tablet-optimized spacing', () => {
      render(
        <ResponsiveContainer data-testid="container">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('p-5', 'gap-5');
    });
  });

  describe('Animation Support', () => {
    beforeEach(() => {
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
    });

    it('should apply animation classes when enabled', () => {
      render(
        <ResponsiveContainer 
          data-testid="container"
          animate
        >
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('transition-all', 'duration-300');
    });

    it('should respect reduced motion preference', () => {
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
        prefersReducedMotion: true,
        colorScheme: 'light'
      });

      render(
        <ResponsiveContainer 
          data-testid="container"
          animate
        >
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByTestId('container');
      expect(container).not.toHaveClass('transition-all');
    });
  });
});

describe('ResponsiveCard', () => {
  beforeEach(() => {
    mockUseDeviceDetection.mockReturnValue({
      deviceType: 'mobile',
      platform: 'iOS',
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      screenSize: { width: 375, height: 812 },
      pixelRatio: 3,
      orientation: 'portrait',
      hasTouch: true,
      hasHover: false,
      prefersReducedMotion: false,
      colorScheme: 'light'
    });
  });

  it('should render with card-specific styling', () => {
    render(
      <ResponsiveCard data-testid="card">
        <div>Card Content</div>
      </ResponsiveCard>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-card', 'border', 'rounded-lg', 'shadow-sm');
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });
});

describe('ResponsiveSection', () => {
  it('should render with section-specific styling', () => {
    render(
      <ResponsiveSection data-testid="section">
        <div>Section Content</div>
      </ResponsiveSection>
    );

    const section = screen.getByTestId('section');
    expect(section).toHaveClass('space-y-4');
    expect(screen.getByText('Section Content')).toBeInTheDocument();
  });
});

describe('ResponsiveGrid', () => {
  beforeEach(() => {
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
  });

  it('should render with grid layout and responsive columns', () => {
    render(
      <ResponsiveGrid data-testid="grid">
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );

    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid', 'grid-cols-3');
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});

describe('ResponsiveList', () => {
  it('should render with list-specific styling', () => {
    render(
      <ResponsiveList data-testid="list">
        <div>List Item 1</div>
        <div>List Item 2</div>
      </ResponsiveList>
    );

    const list = screen.getByTestId('list');
    expect(list).toHaveClass('space-y-2');
    expect(screen.getByText('List Item 1')).toBeInTheDocument();
    expect(screen.getByText('List Item 2')).toBeInTheDocument();
  });
});

describe('Accessibility Features', () => {
  beforeEach(() => {
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
  });

  it('should support custom ARIA attributes', () => {
    render(
      <ResponsiveContainer 
        data-testid="container"
        role="region"
        aria-label="Test region"
      >
        <div>Content</div>
      </ResponsiveContainer>
    );

    const container = screen.getByTestId('container');
    expect(container).toHaveAttribute('role', 'region');
    expect(container).toHaveAttribute('aria-label', 'Test region');
  });
});