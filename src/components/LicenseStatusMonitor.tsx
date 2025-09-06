import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { routeMiddleware } from '../middleware/routeMiddleware';
import { supabase } from '../integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { canExecuteOnlineOperation, useNetworkStatus } from '../utils/networkUtils';

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
  const networkStatus = useNetworkStatus();
  const lastStatusRef = useRef<string | null>(null);
  const monitorIntervalRef = useRef<NodeJS.Timeout>();
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

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
      // Verificar conectividade antes de tentar conectar
      if (!canExecuteOnlineOperation(networkStatus)) {
        console.warn('⚠️ Sem conectividade - pulando configuração do monitoramento em tempo real');
        return;
      }

      try {
        // Limpar subscription anterior se existir
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }

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
              try {
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
              } catch (error) {
                console.error('❌ Erro ao processar mudança de licença:', error);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Monitoramento em tempo real ativo');
              reconnectAttempts.current = 0; // Reset contador de tentativas
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Erro no canal de monitoramento');
              handleReconnection();
            } else if (status === 'TIMED_OUT') {
              console.warn('⏰ Timeout no canal de monitoramento');
              handleReconnection();
            } else if (status === 'CLOSED') {
              console.warn('🔒 Canal de monitoramento fechado');
              handleReconnection();
            }
          });
      } catch (error) {
        console.error('❌ Erro ao configurar monitoramento em tempo real:', error);
        handleReconnection();
      }
    };

    const handleReconnection = () => {
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error(`❌ Máximo de tentativas de reconexão atingido (${maxReconnectAttempts})`);
        return;
      }

      reconnectAttempts.current++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Backoff exponencial, máx 30s
      
      console.log(`🔄 Tentativa de reconexão ${reconnectAttempts.current}/${maxReconnectAttempts} em ${delay}ms`);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (canExecuteOnlineOperation(networkStatus)) {
          setupRealtimeMonitoring();
        } else {
          console.warn('⚠️ Ainda sem conectividade - adiando reconexão');
          handleReconnection(); // Tentar novamente
        }
      }, delay);
    };

    // Iniciar monitoramento em tempo real
    setupRealtimeMonitoring();

    // Verificação periódica como fallback (a cada 2 minutos)
    const setupPeriodicCheck = () => {
      monitorIntervalRef.current = setInterval(async () => {
        try {
          // Só fazer verificação se estivermos online
          if (!canExecuteOnlineOperation(networkStatus)) {
            console.log('⚠️ Offline - pulando verificação periódica de licença');
            return;
          }

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
          
          // Se for erro de conectividade, não fazer nada
          if (error instanceof TypeError && error.message.includes('fetch')) {
            console.log('🌐 Erro de conectividade na verificação periódica - ignorando');
          }
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
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
      
      // Reset reconnection attempts
      reconnectAttempts.current = 0;
    };
  }, [user, onLicenseStatusChange, location.pathname]);

  // Verificação inicial do status da licença usando RPC
  useEffect(() => {
    if (!user) return;

    const checkInitialStatus = async () => {
      try {
        // Verificar conectividade antes de fazer a chamada
        if (!canExecuteOnlineOperation(networkStatus)) {
          console.log('⚠️ Offline - pulando verificação inicial de licença');
          return;
        }

        const { data, error } = await supabase
          .rpc('get_user_license_status', {
            p_user_id: user.id
          });

        if (error) {
          console.warn('⚠️ Erro RPC ao verificar status inicial da licença:', error);
          return;
        }

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
        
        // Se for erro de conectividade, não fazer nada
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.log('🌐 Erro de conectividade na verificação inicial - ignorando');
        }
      }
    };

    checkInitialStatus();
  }, [user, onLicenseStatusChange]);

  // Componente invisível - não renderiza nada
  return null;
};

export default LicenseStatusMonitor;