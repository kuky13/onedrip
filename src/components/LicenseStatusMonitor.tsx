import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { routeMiddleware } from '../middleware/routeMiddleware';
import { supabase } from '../integrations/supabase/client';
import { useLocation } from 'react-router-dom';

interface LicenseStatusMonitorProps {
  onLicenseStatusChange?: (status: 'active' | 'inactive') => void;
}

/**
 * Componente invisível que monitora mudanças no status da licença em tempo real
 * Utiliza Supabase Realtime para detectar alterações e redirecionar automaticamente
 */
export const LicenseStatusMonitor: React.FC<LicenseStatusMonitorProps> = ({
  onLicenseStatusChange
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const lastStatusRef = useRef<string | null>(null);
  const monitorIntervalRef = useRef<NodeJS.Timeout>();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      // Limpar monitoramento se usuário não estiver logado
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = undefined;
      }
      return;
    }

    console.log('🔍 Iniciando monitoramento de licença para usuário:', user.id);

    // Monitoramento em tempo real via Supabase Realtime
    const setupRealtimeMonitoring = () => {
      subscriptionRef.current = supabase
        .channel(`license_changes_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'licenses',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('📡 Mudança detectada na licença:', payload);
            
            const oldLicense = payload.old as any;
            const newLicense = payload.new as any;
            
            // Ignorar mudanças que são apenas do last_validation (para evitar loops)
            if (oldLicense && newLicense && 
                oldLicense.is_active === newLicense.is_active &&
                oldLicense.expires_at === newLicense.expires_at &&
                oldLicense.user_id === newLicense.user_id) {
              console.log('🔍 Ignorando atualização de last_validation apenas');
              return;
            }
            
            const currentStatus = newLicense.is_active ? 'active' : 'inactive';
            
            if (lastStatusRef.current !== currentStatus) {
              lastStatusRef.current = currentStatus;
              
              console.log(`🔄 Status da licença alterado para: ${currentStatus}`);
              
              // Invalidar cache do middleware
              routeMiddleware.invalidateState();
              
              // Notificar mudança via callback
              onLicenseStatusChange?.(currentStatus);
              
              // Se licença foi desativada, forçar redirecionamento
              if (currentStatus === 'inactive') {
                console.warn('🚫 Licença desativada - redirecionando para verificação');
                
                // Aguardar um pouco para garantir que o estado foi invalidado
                setTimeout(() => {
                  window.location.href = '/verify-licenca';
                }, 100);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Monitoramento em tempo real ativo');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Erro no canal de monitoramento');
            // Tentar reconectar após 5 segundos
            setTimeout(setupRealtimeMonitoring, 5000);
          }
        });
    };

    // Iniciar monitoramento em tempo real
    setupRealtimeMonitoring();

    // Verificação periódica como fallback (a cada 2 minutos)
    const setupPeriodicCheck = () => {
      monitorIntervalRef.current = setInterval(async () => {
        try {
          console.log('🔄 Verificação periódica de licença');
          
          const result = await routeMiddleware.canAccessRoute(location.pathname, true);
          
          if (!result.canAccess && result.licenseStatus === 'inactive') {
            console.warn('🚫 Licença inativa detectada na verificação periódica');
            
            // Invalidar estado e redirecionar
            routeMiddleware.invalidateState();
            
            onLicenseStatusChange?.('inactive');
            
            // Redirecionar para verificação
            window.location.href = '/verify-licenca';
          }
        } catch (error) {
          console.error('❌ Erro na verificação periódica de licença:', error);
        }
      }, 2 * 60 * 1000); // 2 minutos
    };

    setupPeriodicCheck();

    // Cleanup ao desmontar ou trocar usuário
    return () => {
      console.log('🧹 Limpando monitoramento de licença');
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = undefined;
      }
    };
  }, [user, onLicenseStatusChange, location.pathname]);

  // Verificação inicial do status da licença usando RPC
  useEffect(() => {
    if (!user) return;

    const checkInitialStatus = async () => {
      try {
        const { data } = await supabase
          .rpc('get_user_license_status', {
            p_user_id: user.id
          });

        if (data && typeof data === 'object') {
          const licenseData = data as { has_license: boolean; is_valid: boolean };
          const initialStatus = (licenseData.has_license && licenseData.is_valid) ? 'active' : 'inactive';
          lastStatusRef.current = initialStatus;
          
          console.log(`📊 Status inicial da licença: ${initialStatus}`);
          
          // Se já está inativo, notificar
          if (initialStatus === 'inactive') {
            onLicenseStatusChange?.('inactive');
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao verificar status inicial da licença:', error);
      }
    };

    checkInitialStatus();
  }, [user, onLicenseStatusChange]);

  // Componente invisível - não renderiza nada
  return null;
};

export default LicenseStatusMonitor;