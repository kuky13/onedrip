/**
 * Componente de proteção unificado que substitui AuthGuard e ProtectedRoute
 * Utiliza o middleware de rotas para proteção centralizada
 */

import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { routeMiddleware } from '@/middleware/routeMiddleware';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { useLicenseVerification } from '@/hooks/useLicenseVerification';
import { MobileLoading } from '@/components/ui/mobile-loading';
import { DashboardSkeleton } from '@/components/ui/loading-states';
import { EmptyState } from '@/components/EmptyState';
import { Shield, User, AlertTriangle } from 'lucide-react';
import { AuthPage } from '@/pages/AuthPage';
import { LicensePage } from '@/pages/LicensePage';
import { supabase } from '@/integrations/supabase/client';
import { LicenseStatusMonitor } from '@/components/LicenseStatusMonitor';
import { securityLogger } from '@/services/SecurityLogger';

interface UnifiedProtectionGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: string;
  fallback?: React.ReactNode;
  skipMiddleware?: boolean; // Para casos especiais onde não queremos usar o middleware
}

interface ProtectionState {
  isLoading: boolean;
  canAccess: boolean;
  redirectTo?: string;
  reason?: string;
  showEmailVerification?: boolean;
}

export const UnifiedProtectionGuard = ({
  children,
  requiredRole,
  requiredPermission,
  fallback,
  skipMiddleware = false
}: UnifiedProtectionGuardProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, hasRole, hasPermission, isInitialized } = useAuth();
  const { data: licenseData, isLoading: licenseLoading } = useLicenseVerification(user?.id);
  
  const [protectionState, setProtectionState] = useState<ProtectionState>({
    isLoading: true,
    canAccess: false
  });
  
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const lastPathRef = useRef<string>('');
  const checkTimeoutRef = useRef<NodeJS.Timeout>();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const periodicCheckRef = useRef<NodeJS.Timeout>();
  const isCheckingRef = useRef<boolean>(false);
  const [lastLicenseCheck, setLastLicenseCheck] = useState<Date>(new Date());

  // Função para verificação periódica de licença
  const performPeriodicLicenseCheck = async () => {
    if (!user?.id) return;

    try {
      const licenseResult = await routeMiddleware.checkLicenseStatus(user.id);
      
      // Log da verificação periódica
      await securityLogger.logUserActivity(
        user.id,
        'license_check',
        `Verificação periódica de licença: ${licenseResult.status}`,
        {
          check_type: 'periodic',
          license_status: licenseResult.status,
          expires_at: licenseResult.expiresAt,
          interval: '5_minutes'
        }
      );

      // Se a licença estiver inativa, forçar verificação completa
      if (licenseResult.status === 'inactive' || licenseResult.status === 'expired') {
        console.warn('🚨 Licença inativa detectada na verificação periódica');
        await checkRouteProtection(true);
      }

      setLastLicenseCheck(new Date());
    } catch (error) {
      console.error('❌ Erro na verificação periódica de licença:', error);
    }
  };

  // Função para verificar proteção usando middleware
  const checkRouteProtection = async (forceRefresh = false) => {
    // Evitar verificações simultâneas
    if (isCheckingRef.current && !forceRefresh) {
      return;
    }

    if (skipMiddleware) {
      // Lógica tradicional para casos especiais
      setProtectionState({
        isLoading: false,
        canAccess: true
      });
      return;
    }

    try {
      isCheckingRef.current = true;
      setProtectionState(prev => ({ ...prev, isLoading: true }));
      
      const result = await routeMiddleware.canAccessRoute(location.pathname, forceRefresh);
      
      setProtectionState({
        isLoading: false,
        canAccess: result.canAccess,
        redirectTo: result.redirectTo,
        reason: result.reason
      });

      // Log do resultado da verificação para debug
      if (!result.canAccess && result.redirectTo) {
        console.log(`🔄 Acesso negado para ${location.pathname}, deve mostrar: ${result.redirectTo} - ${result.reason}`);
        
        // Log de acesso negado
        if (user?.id) {
          await securityLogger.logUserActivity(
            user.id,
            'access_denied',
            `Acesso negado para ${location.pathname}`,
            {
              attempted_path: location.pathname,
              redirect_to: result.redirectTo,
              reason: result.reason,
              user_agent: navigator.userAgent
            }
          );
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar proteção de rota:', error);
      setProtectionState({
        isLoading: false,
        canAccess: false,
        reason: 'Erro interno de verificação'
      });
    } finally {
      isCheckingRef.current = false;
    }
  };

  // Verificar proteção quando a rota muda (com debounce)
  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname;
      
      // Limpar timeout anterior
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Debounce de 50ms para mudanças de rota
      debounceTimeoutRef.current = setTimeout(() => {
        checkRouteProtection();
      }, 50);
    }
  }, [location.pathname]);

  // Verificar proteção quando o estado de auth muda
  useEffect(() => {
    if (isInitialized && !authLoading) {
      checkRouteProtection(true); // Force refresh quando auth muda
    }
  }, [user, isInitialized, authLoading]);

  // Verificar proteção quando licença muda
  useEffect(() => {
    if (!licenseLoading && licenseData) {
      checkRouteProtection(true); // Force refresh quando licença muda
    }
  }, [licenseData, licenseLoading]);

  // Configurar verificação periódica de licença
  useEffect(() => {
    if (user?.id && !skipMiddleware) {
      // Verificação inicial
      performPeriodicLicenseCheck();
      
      // Configurar verificação periódica a cada 5 minutos
      periodicCheckRef.current = setInterval(() => {
        performPeriodicLicenseCheck();
      }, 5 * 60 * 1000); // 5 minutos
      
      console.log('🔄 Verificação periódica de licença configurada (5 min)');
    }
    
    return () => {
      if (periodicCheckRef.current) {
        clearInterval(periodicCheckRef.current);
      }
    };
  }, [user?.id, skipMiddleware]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (periodicCheckRef.current) {
        clearInterval(periodicCheckRef.current);
      }
    };
  }, []);

  // Timeout protection
  useEffect(() => {
    if (authLoading || !isInitialized || protectionState.isLoading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Timeout de proteção atingido - forçando estado de erro');
        setTimeoutReached(true);
      }, 10000); // 10 segundos
      
      return () => clearTimeout(timeout);
    } else {
      setTimeoutReached(false);
    }
  }, [authLoading, isInitialized, protectionState.isLoading]);

  // Loading states with timeout protection
  if (authLoading || !isInitialized || protectionState.isLoading) {
    if (timeoutReached) {
      return (
        <EmptyState
          icon={AlertTriangle}
          title="Erro de Carregamento"
          description="O sistema está demorando para responder. Tente recarregar a página."
          action={{
            label: "Recarregar Página",
            onClick: () => window.location.reload()
          }}
        />
      );
    }
    
    return <MobileLoading message="Verificando permissões..." />;
  }

  // Se não pode acessar, mostrar componente apropriado
  if (!protectionState.canAccess) {
    const { redirectTo, reason } = protectionState;

    // Casos especiais que precisam de componentes específicos
    if (redirectTo === '/auth') {
      return <AuthPage />;
    }

    if (redirectTo === '/licenca') {
      return <LicensePage />;
    }

    // Verificação de email não confirmado
    if (!user?.email_confirmed_at && user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full p-6 bg-card rounded-lg border shadow-sm">
            <h2 className="text-2xl font-bold text-center mb-4 flex items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Confirme seu e-mail
            </h2>
            <p className="text-muted-foreground text-center mb-4">
              Por segurança, você precisa confirmar seu e-mail antes de acessar o sistema.
              Verifique sua caixa de entrada e clique no link de confirmação.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
              <p className="text-amber-800 text-sm">
                <strong>Medida de Segurança:</strong> Esta verificação protege sua conta e os dados do sistema.
              </p>
            </div>
            <div className="flex justify-center">
              <button 
                onClick={async () => {
                  setEmailCheckLoading(true);
                  try {
                    // Forçar refresh da sessão
                    await supabase.auth.refreshSession();
                    const { data: { session } } = await supabase.auth.getSession();
                    
                    if (session?.user?.email_confirmed_at) {
                      // Invalidar cache e recarregar com delay para evitar loops
                      routeMiddleware.invalidateState();
                      
                      setTimeout(() => {
                        checkRouteProtection(true);
                      }, 200);
                    } else {
                      // Mostrar mensagem se ainda não confirmado
                      console.log('📧 Email ainda não confirmado');
                    }
                  } catch (error) {
                    console.error('❌ Erro ao verificar confirmação:', error);
                  } finally {
                    setEmailCheckLoading(false);
                  }
                }} 
                disabled={emailCheckLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {emailCheckLoading ? 'Verificando...' : 'Já confirmei'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Outros casos de acesso negado
    return fallback || (
      <EmptyState
        icon={redirectTo === '/unauthorized' ? Shield : User}
        title="Acesso Negado"
        description={reason || 'Você não tem permissão para acessar esta página.'}
        action={{
          label: "Verificar Licença",
          onClick: () => navigate('/verify-licenca', { replace: true })
        }}
      />
    );
  }

  // Verificações adicionais específicas (role e permission)
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <EmptyState
        icon={Shield}
        title="Permissão Insuficiente"
        description={`Você precisa ter o nível de acesso "${requiredRole}" ou superior para acessar esta página.`}
        action={{
          label: "Verificar Licença",
          onClick: () => navigate('/verify-licenca', { replace: true })
        }}
      />
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <EmptyState
        icon={Shield}
        title="Permissão Negada"
        description="Você não tem permissão para acessar esta funcionalidade."
        action={{
          label: "Verificar Licença",
          onClick: () => navigate('/verify-licenca', { replace: true })
        }}
      />
    );
  }

  // Se chegou até aqui, pode acessar
  return (
    <>
      {/* Monitor de status de licença em tempo real */}
      {user?.id && !skipMiddleware && (
        <LicenseStatusMonitor 
          userId={user.id}
          onLicenseStatusChange={(status) => {
            if (status === 'inactive' || status === 'expired') {
              console.warn('🚨 Mudança de status de licença detectada:', status);
              // Forçar nova verificação de proteção
              checkRouteProtection(true);
            }
          }}
        />
      )}
      {children}
    </>
  );
};

export default UnifiedProtectionGuard;