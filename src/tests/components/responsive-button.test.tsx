import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ResponsiveButton, ActionButton, NavigationButton, FloatingActionButton } from '@/components/ui/responsive-button';

// Mock the useDeviceDetection hook
vi.mock('@/hooks/useDeviceDetection', () => ({
  useDeviceDetection: vi.fn()
}));

import { useDeviceDetection } from '@/hooks/useDeviceDetection';
const mockUseDeviceDetection = vi.mocked(useDeviceDetection);

// Mock do navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn(),
});

describe('ResponsiveButton', () => {
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

    it('should render with desktop-optimized text and size', () => {
      mockUseDeviceDetection.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        deviceType: 'desktop',
        deviceCapabilities: { hasVibration: false, hasTouch: false }
      });

      render(
        <ResponsiveButton
          mobileText="Mobile Button"
        >
          Default Text
        </ResponsiveButton>
      );

      expect(screen.getByText('Default Text')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('min-h-[36px]');
    });

    it('should show tooltip on hover', async () => {
      render(
        <ResponsiveButton
          mobileText="Buscar"
          tooltip="Clique para pesquisar"
          onClick={() => {}}
        >
          Pesquisar
        </ResponsiveButton>
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      
      expect(screen.getByText('Clique para pesquisar')).toBeInTheDocument();
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

    it('should render with mobile-optimized text and size', () => {
      mockUseDeviceDetection.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        deviceType: 'mobile',
        deviceCapabilities: { hasVibration: true, hasTouch: true }
      });

      render(
        <ResponsiveButton
          mobileText="Buscar"
          onClick={() => {}}
        >
          Pesquisar Orçamentos
        </ResponsiveButton>
      );

      expect(screen.getByText('Buscar')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('min-h-[44px]');
    });

    it('should trigger haptic feedback on touch devices', async () => {
      mockUseDeviceDetection.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        deviceType: 'mobile',
        deviceCapabilities: { hasVibration: true, hasTouch: true }
      });

      // Mock navigator.vibrate
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        writable: true
      });

      const user = userEvent.setup();

      render(
        <ResponsiveButton hapticFeedback={true}>
          Mobile Button
        </ResponsiveButton>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(vibrateMock).toHaveBeenCalledWith(10);
    });
  });

  describe('Tablet Device', () => {
    beforeEach(() => {
      mockUseDeviceDetection.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        deviceType: 'tablet',
        deviceCapabilities: { hasVibration: false, hasTouch: true }
      });
    });

    it('should render with tablet-optimized size', () => {
      render(
        <ResponsiveButton
          mobileText="Buscar"
          onClick={() => {}}
        >
          Pesquisar Orçamentos
        </ResponsiveButton>
      );

      expect(screen.getByText('Pesquisar Orçamentos')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('min-h-[40px]');
    });
  });
});

describe('ActionButton', () => {
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

  it('should render with action-specific styling', () => {
    render(
      <ActionButton onClick={() => {}}>
        Confirmar
      </ActionButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
  });
});

describe('NavigationButton', () => {
  it('should render with navigation-specific styling', () => {
    render(
      <NavigationButton onClick={() => {}}>
        Voltar
      </NavigationButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Voltar')).toBeInTheDocument();
  });
});

describe('FloatingActionButton', () => {
  it('should render with floating action button styling', () => {
    render(
      <FloatingActionButton onClick={() => {}}>
        +
      </FloatingActionButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('fixed', 'bottom-6', 'right-6', 'rounded-full');
    expect(screen.getByText('+')).toBeInTheDocument();
  });
});