/**
 * Utilitários para verificação de conectividade de rede
 * OneDrip - Tratamento de modo offline
 */

export interface NetworkStatus {
  isOnline: boolean;
  isSupabaseReachable: boolean;
  lastChecked: Date;
}

let networkStatus: NetworkStatus = {
  isOnline: navigator.onLine,
  isSupabaseReachable: false,
  lastChecked: new Date()
};

let networkListeners: ((status: NetworkStatus) => void)[] = [];

// Constantes do Supabase
const SUPABASE_URL = "https://oghjlypdnmqecaavekyr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY";

/**
 * Verifica se o Supabase está acessível
 */
export const checkSupabaseConnectivity = async (): Promise<boolean> => {
  try {
    // Verificar se as constantes estão definidas
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('⚠️ Configuração do Supabase não encontrada');
      return false;
    }
    
    // Fazer uma requisição simples para verificar conectividade
    const response = await fetch(SUPABASE_URL + '/rest/v1/', {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_ANON_KEY
      },
      signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
    });
    
    return response.ok;
  } catch (error) {
    console.warn('⚠️ Supabase não acessível:', error);
    return false;
  }
};

/**
 * Verifica o status completo da rede
 */
export const checkNetworkStatus = async (): Promise<NetworkStatus> => {
  const isOnline = navigator.onLine;
  let isSupabaseReachable = false;
  
  if (isOnline) {
    isSupabaseReachable = await checkSupabaseConnectivity();
  }
  
  const status: NetworkStatus = {
    isOnline,
    isSupabaseReachable,
    lastChecked: new Date()
  };
  
  networkStatus = status;
  
  // Notificar listeners
  networkListeners.forEach(listener => {
    try {
      listener(status);
    } catch (error) {
      console.error('Erro no listener de rede:', error);
    }
  });
  
  return status;
};

/**
 * Adiciona um listener para mudanças de status de rede
 */
export const addNetworkListener = (listener: (status: NetworkStatus) => void) => {
  networkListeners.push(listener);
  
  // Retorna função para remover o listener
  return () => {
    networkListeners = networkListeners.filter(l => l !== listener);
  };
};

/**
 * Obtém o status atual da rede (cached)
 */
export const getCurrentNetworkStatus = (): NetworkStatus => {
  return { ...networkStatus };
};

/**
 * Verifica se uma operação pode ser executada online
 */
export const canExecuteOnlineOperation = async (): Promise<boolean> => {
  const status = await checkNetworkStatus();
  return status.isOnline && status.isSupabaseReachable;
};

/**
 * Executa uma operação com fallback offline
 */
export const executeWithOfflineFallback = async <T>(
  onlineOperation: () => Promise<T>,
  offlineFallback: () => T | Promise<T>,
  options: {
    showOfflineMessage?: boolean;
    retryOnReconnect?: boolean;
  } = {}
): Promise<T> => {
  try {
    const canExecute = await canExecuteOnlineOperation();
    
    if (canExecute) {
      return await onlineOperation();
    } else {
      if (options.showOfflineMessage) {
        console.warn('⚠️ Executando em modo offline');
      }
      return await offlineFallback();
    }
  } catch (error) {
    console.error('Erro na operação online, usando fallback:', error);
    return await offlineFallback();
  }
};

/**
 * Inicializa os listeners de rede
 */
export const initializeNetworkMonitoring = () => {
  // Listener para mudanças de conectividade
  window.addEventListener('online', () => {
    console.log('🌐 Conectividade restaurada');
    checkNetworkStatus();
  });
  
  window.addEventListener('offline', () => {
    console.log('📴 Conectividade perdida');
    checkNetworkStatus();
  });
  
  // Verificação inicial
  checkNetworkStatus();
  
  // Verificação periódica (a cada 30 segundos)
  setInterval(() => {
    if (navigator.onLine) {
      checkNetworkStatus();
    }
  }, 30000);
};

/**
 * Hook personalizado para React
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>(getCurrentNetworkStatus());
  
  useEffect(() => {
    const removeListener = addNetworkListener(setStatus);
    
    // Verificação inicial
    checkNetworkStatus();
    
    return removeListener;
  }, []);
  
  return status;
};

// Importar React hooks se necessário
import { useState, useEffect } from 'react';