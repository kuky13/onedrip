import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyDataLoader } from '@/hooks/useCompanyDataLoader';
import { supabase } from '@/integrations/supabase/client';
import { AdaptiveLayout } from '@/components/adaptive/AdaptiveLayout';
import { DashboardLiteStatsEnhanced } from '@/components/lite/enhanced/DashboardLiteStatsEnhanced';
import { DashboardLiteQuickAccessEnhanced } from '@/components/lite/enhanced/DashboardLiteQuickAccessEnhanced';
import { DashboardLiteLicenseStatus } from '@/components/lite/DashboardLiteLicenseStatus';
import { DashboardLiteHelpSupport } from '@/components/lite/DashboardLiteHelpSupport';
import { useResponsive } from '@/hooks/useResponsive';
import { BudgetErrorBoundary, AuthErrorBoundary } from '@/components/ErrorBoundaries';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { useBudgetData } from '@/hooks/useBudgetData';
import { PageTransition } from '@/components/ui/animations/page-transitions';
import { IOSSpinner } from '@/components/ui/animations/loading-states';
import SupportButton from '@/components/SupportButton';
import { useNavigate } from 'react-router-dom';

export const DashboardHome = () => {
  const { profile, user, hasPermission } = useAuth();
  const { isDesktop } = useResponsive();
  const navigate = useNavigate();
  
  // Hook para carregar dados da empresa automaticamente
  const companyDataLoader = useCompanyDataLoader();
  
  // Memoização da verificação de iOS para evitar recálculos
  const isiOSDevice = useMemo(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  }, []);

  // Aguardar user, profile e dados da empresa estarem disponíveis
  const isReady = useMemo(() => {
    const basicReady = Boolean(user?.id && profile);
    // Não bloquear se os dados da empresa estão carregando, mas logar se há erro
    if (companyDataLoader.error) {
      console.warn('Erro ao carregar dados da empresa:', companyDataLoader.error);
    }
    return basicReady;
  }, [user?.id, profile, companyDataLoader.error]);

  // Hook para gerenciar dados dos orçamentos
  const { budgets, loading, error, refreshing, handleRefresh } = useBudgetData(user?.id || '');

  // Real-time subscription otimizada
  useEffect(() => {
    if (!isReady || !user?.id) return;

    // Subscription para atualizações em tempo real
    let subscription: any = null;
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const setupSubscription = () => {
      subscription = supabase.channel('budget_changes_home').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budgets',
        filter: `owner_id=eq.${user.id}`
      }, payload => {
        console.log('Budget change detected:', payload);
        
        // Clear previous timer
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        // Debounce para evitar múltiplas chamadas
        debounceTimer = setTimeout(() => {
          handleRefresh();
          debounceTimer = null;
        }, 500);
      }).subscribe();
    };
    setupSubscription();
    
    return () => {
      // Clear debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Remove subscription properly
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [isReady, user?.id, handleRefresh]);



  // Otimização para iOS: não renderizar nada até dados estarem prontos
  if (!isReady) {
    return (
      <div 
        className="h-[100dvh] bg-background flex items-center justify-center" 
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none'
        }}
      >
        <div className="text-center space-y-4">
          <IOSSpinner size="lg" />
          <p className="text-sm text-muted-foreground font-medium">
            {companyDataLoader.isLoading ? 'Carregando dados da empresa...' : 'Carregando...'}
          </p>
          {companyDataLoader.error && (
            <p className="text-xs text-red-500 max-w-xs mx-auto">
              Aviso: {companyDataLoader.error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <AuthErrorBoundary>
      <BudgetErrorBoundary>
        <LayoutProvider>
          <AdaptiveLayout>
            <PageTransition type="fadeScale">
              <div className={`${isDesktop ? 'desktop-dashboard-layout' : 'p-4 space-y-6'}`}>
                <div className={`${isDesktop ? 'desktop-dashboard-main' : ''}`}>
                  <DashboardLiteStatsEnhanced profile={profile} userId={user?.id} />
                  <DashboardLiteQuickAccessEnhanced 
                    hasPermission={hasPermission} 
                  />
                </div>
                {isDesktop && (
                  <div className="desktop-dashboard-sidebar">
                    <DashboardLiteLicenseStatus profile={profile} />
                    <DashboardLiteHelpSupport />
                  </div>
                )}
                {!isDesktop && (
                  <>
                    <DashboardLiteLicenseStatus profile={profile} />
                    <DashboardLiteHelpSupport />
                  </>
                )}
              </div>
            </PageTransition>
            <SupportButton variant="floating" />
          </AdaptiveLayout>
        </LayoutProvider>
      </BudgetErrorBoundary>
    </AuthErrorBoundary>
  );
};