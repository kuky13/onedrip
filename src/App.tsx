import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AcceptTermsModal, useTermsAcceptance } from "@/components/AcceptTermsModal";
import { ReloadMonitor } from "@/components/ReloadMonitor";
import Index from "./pages/Index";
import { AuthPage } from "./pages/AuthPage";
import { SignUpPage } from "./pages/SignUpPage";
import { SignPage } from "./pages/SignPage";
import { PlansPage } from "./plans/PlansPage";
import { PurchaseSuccessPage } from "./pages/PurchaseSuccessPage";


import { DashboardHome } from "./pages/dashboard/DashboardHome";
import { BudgetsPage } from "./pages/BudgetsPage";
import { BudgetFormPage } from "./pages/budgets/BudgetFormPage";
import { DataManagementPage } from "./pages/data-management/DataManagementPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { AdminPage } from "./pages/admin/AdminPage";
import { CookiePage } from "./pages/CookiePage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { CookiesPage } from "./pages/CookiesPage";
import { IOSRedirectHandler } from "./components/IOSRedirectHandler";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";
import SecurityHeaders from "@/components/security/SecurityHeaders";
import { UnifiedProtectionGuard } from "@/components/UnifiedProtectionGuard";
import { SmartNavigation } from "@/components/SmartNavigation";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ResetEmailPage } from "./pages/ResetEmailPage";
import { VerifyPage } from "./pages/VerifyPage";
import ServiceOrdersPageSimple from "./pages/ServiceOrdersPageSimple";
import { ServiceOrderFormPage } from "./pages/ServiceOrderFormPage";
import { ServiceOrderDetailsPage } from "./pages/ServiceOrderDetailsPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import { LicensePage } from "./pages/LicensePage";
import VerifyLicensePage from "./pages/VerifyLicensePage";
import { PWAProvider } from "./components/PWAProvider";
import NotificationsPage from "./pages/NotificationsPage";
import ServiceOrderSharePage from "./pages/ServiceOrderSharePage";
import { ServiceOrderSettings } from "./components/ServiceOrderSettings";
import HelpCenterPage from "./pages/HelpCenterPage";
import Security from "./pages/Security";
import SuportePage from "./pages/SuportePage";

import { CompanyBrandingSettings } from "./components/CompanyBrandingSettings";
import { useAutoRedirect } from "./hooks/useAutoRedirect";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: true,
      retry: 1,
    },
  },
});

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const { needsAcceptance, isLoading: termsLoading, markAsAccepted } = useTermsAcceptance();
  const location = useLocation();
  
  // Hook para redirecionamento automático em caso de reload
  useAutoRedirect();

  const handleAcceptTerms = () => {
    markAsAccepted();
  };

  // Mostrar loading enquanto carrega autenticação ou termos
  if (authLoading || termsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Páginas onde o modal NÃO deve aparecer
  const excludedPages = ['/terms', '/privacy', '/cookies'];
  const isExcludedPage = excludedPages.includes(location.pathname);

  // Só mostrar o modal se:
  // - O usuário estiver logado
  // - Precisar aceitar os termos
  // - NÃO estiver em uma página excluída
  const shouldShowModal = Boolean(user && needsAcceptance && !isExcludedPage);

  return (
    <>
      <ReloadMonitor />
      <SecurityHeaders />
      <Toaster />
      <Sonner
        position="top-right"
        expand={false}
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
      <IOSRedirectHandler />
      
      {/* Modal de aceitação de termos - apenas para usuários logados */}
      <AcceptTermsModal
        isOpen={shouldShowModal}
        onAccept={handleAcceptTerms}
      />
      
      <SmartNavigation>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Redirecionamentos automáticos para compatibilidade */}
          <Route path="/dashboard-lite" element={<Navigate to="/dashboard" replace />} />
          <Route path="/painel-lite" element={<Navigate to="/painel" replace />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/licenca" element={<LicensePage />} />
        <Route path="/verify-licenca" element={<VerifyLicensePage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/purchase-success" element={<PurchaseSuccessPage />} />

        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        
        {/* Rota pública para compartilhamento de OS */}
        <Route path="/share/service-order/:shareToken" element={<ServiceOrderSharePage />} />
        
        <Route
          path="/reset-email"
          element={
            <UnifiedProtectionGuard>
              <ResetEmailPage />
            </UnifiedProtectionGuard>
          }
        />
        <Route
          path="/signup"
          element={<SignUpPage />}
        />
        <Route
          path="/sign"
          element={<SignPage />}
        />
        <Route 
          path="/dashboard" 
          element={
            <UnifiedProtectionGuard>
              <DashboardHome />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/painel" 
          element={
            <UnifiedProtectionGuard>
              <DashboardHome />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/budgets" 
          element={
            <UnifiedProtectionGuard>
              <BudgetsPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/budgets/new" 
          element={
            <UnifiedProtectionGuard>
              <BudgetFormPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/budgets/:id/edit" 
          element={
            <UnifiedProtectionGuard>
              <BudgetFormPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/data-management" 
          element={
            <UnifiedProtectionGuard>
              <DataManagementPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <UnifiedProtectionGuard>
              <SettingsPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <UnifiedProtectionGuard>
              <AdminPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route
          path="/service-orders"
          element={
            <UnifiedProtectionGuard>
              <ServiceOrdersPageSimple />
            </UnifiedProtectionGuard>
          }
        />
        <Route 
          path="/service-orders/new" 
          element={
            <UnifiedProtectionGuard>
              <ServiceOrderFormPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/service-orders/:id/edit" 
          element={
            <UnifiedProtectionGuard>
              <ServiceOrderFormPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/service-orders/:id" 
          element={
            <UnifiedProtectionGuard>
              <ServiceOrderDetailsPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/service-orders/settings" 
          element={
            <UnifiedProtectionGuard>
              <ServiceOrderSettings />
            </UnifiedProtectionGuard>
          } 
        />



        <Route 
          path="/service-orders/settings/branding" 
          element={
            <UnifiedProtectionGuard>
              <CompanyBrandingSettings />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/central-de-ajuda" 
          element={
            <UnifiedProtectionGuard>
              <HelpCenterPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/security" 
          element={
            <UnifiedProtectionGuard>
              <Security />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/msg" 
          element={
            <UnifiedProtectionGuard>
              <NotificationsPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route path="/game" element={<CookiePage />} />
        
        {/* Novas rotas para políticas e termos */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/suporte" element={<SuportePage />} />
        
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SmartNavigation>
    </>
  );
};

const App = () => {
  console.log('🔄 App component iniciando...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <ErrorBoundary>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <AuthProvider>
                <PWAProvider>
                  <AppContent />
                </PWAProvider>
              </AuthProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;