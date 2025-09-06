import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBudgetData } from '@/hooks/useBudgetData';
import { AdaptiveLayout } from '@/components/adaptive/AdaptiveLayout';
import { DashboardLiteContent } from '@/components/lite/DashboardLiteContent';
import { BudgetErrorBoundary, AuthErrorBoundary } from '@/components/ErrorBoundaries';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { PageTransition } from '@/components/ui/animations/page-transitions';
import { IOSSpinner } from '@/components/ui/animations/loading-states';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import SupportButton from '@/components/SupportButton';

export const BudgetFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, user, hasPermission } = useAuth();
  const { isDesktop } = useResponsive();
  const isEditMode = Boolean(id);
  
  // Hook para gerenciar dados dos orçamentos
  const { budgets, loading, error, handleRefresh } = useBudgetData(user?.id || '');
  
  // Estado para controlar se está pronto para renderizar
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (user?.id && profile) {
      setIsReady(true);
    }
  }, [user?.id, profile]);
  
  const handleNavigateBack = () => {
    navigate('/budgets');
  };
  
  const handleNavigateTo = (view: string, budgetId?: string) => {
    if (budgetId) {
      navigate(`/budgets/${budgetId}/edit`);
    } else {
      navigate(`/${view}`);
    }
  };
  
  if (!isReady) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <IOSSpinner size="lg" />
          <p className="text-sm text-muted-foreground font-medium">
            Carregando formulário...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <AuthErrorBoundary>
      <BudgetErrorBoundary>
        <LayoutProvider>
          <AdaptiveLayout>
            <PageTransition type="slideLeft">
              <div className="min-h-screen bg-background">
                {/* Header com breadcrumb */}
                <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNavigateBack}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                      </Button>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span 
                          className="cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => navigate('/dashboard')}
                        >
                          Dashboard
                        </span>
                        <span>/</span>
                        <span 
                          className="cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => navigate('/budgets')}
                        >
                          Orçamentos
                        </span>
                        <span>/</span>
                        <span className="text-foreground font-medium">
                          {isEditMode ? 'Editar Orçamento' : 'Novo Orçamento'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Conteúdo do formulário */}
                <div className="container mx-auto px-4 py-6">
                  <DashboardLiteContent 
                    budgets={budgets}
                    loading={loading}
                    error={error}
                    onRefresh={handleRefresh}
                    profile={profile}
                    activeView={isEditMode ? 'edit-budget' : 'new-budget'}
                    userId={user.id}
                    hasPermission={hasPermission}
                    onNavigateBack={handleNavigateBack}
                    onNavigateTo={handleNavigateTo}
                    isiOSDevice={/iPad|iPhone|iPod/.test(navigator.userAgent)}
                    budgetId={id}
                  />
                </div>
              </div>
            </PageTransition>
            <SupportButton variant="floating" />
          </AdaptiveLayout>
        </LayoutProvider>
      </BudgetErrorBoundary>
    </AuthErrorBoundary>
  );
};