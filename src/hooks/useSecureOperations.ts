import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { setSecureItem, getSecureItem } from '@/utils/secureStorage';
import { canExecuteOnlineOperation, useNetworkStatus } from '@/utils/networkUtils';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized: string;
}

interface OperationOptions {
  requireAdmin?: boolean;
  requireEmailConfirmed?: boolean;
  logEvent?: boolean;
  rateLimitKey?: string;
  maxLength?: number;
  inputType?: 'general' | 'email' | 'phone' | 'alphanumeric';
}

/**
 * Hook para operações seguras com validação automática
 * Centraliza validação, sanitização e logs de auditoria
 */
export const useSecureOperations = () => {
  const { showError } = useToast();
  const networkStatus = useNetworkStatus();

  // Função para validar entrada
  const validateInput = useCallback(async (
    input: string,
    options: OperationOptions = {}
  ): Promise<ValidationResult> => {
    try {
      // Validação básica no frontend (sem RPC)
      if (!input || input.trim().length === 0) {
        return {
          isValid: false,
          errors: ['Input não pode ser vazio'],
          sanitized: ''
        };
      }

      const maxLength = options.maxLength || 1000;
      if (input.length > maxLength) {
        return {
          isValid: false,
          errors: [`Input excede tamanho máximo de ${maxLength} caracteres`],
          sanitized: input.substring(0, maxLength)
        };
      }

      // Sanitização básica
      let sanitized = input.trim();
      sanitized = sanitized.replace(/<[^>]*>/g, ''); // Remove HTML tags
      sanitized = sanitized.replace(/[<>"'&]/g, ''); // Remove caracteres perigosos

      // Validações específicas por tipo
      let isValid = true;
      const errors: string[] = [];

      switch (options.inputType) {
        case 'email':
          const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
          if (!emailRegex.test(sanitized)) {
            isValid = false;
            errors.push('Formato de email inválido');
          }
          break;
        case 'phone':
          const phoneRegex = /^[\d\s\(\)\-\+]+$/;
          if (!phoneRegex.test(sanitized)) {
            isValid = false;
            errors.push('Formato de telefone inválido');
          }
          break;
        case 'alphanumeric':
          const alphanumericRegex = /^[A-Za-z0-9\s]+$/;
          if (!alphanumericRegex.test(sanitized)) {
            isValid = false;
            errors.push('Apenas caracteres alfanuméricos são permitidos');
          }
          break;
      }

      return {
        isValid,
        errors,
        sanitized
      };
    } catch (error) {
      console.error('Erro na validação:', error);
      return {
        isValid: false,
        errors: ['Erro na validação do input'],
        sanitized: ''
      };
    }
  }, []);

  // Função para verificar rate limiting (implementação local)
  const checkRateLimit = useCallback(async (
    identifier: string,
    actionType: string,
    maxAttempts = 10,
    windowMinutes = 15
  ): Promise<{ allowed: boolean; attempts: number; resetAt: string }> => {
    try {
      // Implementação simples de rate limiting usando armazenamento seguro
      const key = `rate_limit_${identifier}_${actionType}`;
      const stored = await getSecureItem(key);
      const now = Date.now();
      
      if (!stored) {
        const data = { attempts: 1, windowStart: now };
        await setSecureItem(key, data, { encrypt: true });
        return { allowed: true, attempts: 1, resetAt: new Date(now + windowMinutes * 60000).toISOString() };
      }

      const data = stored;
      const windowStart = data.windowStart;
      const windowEnd = windowStart + (windowMinutes * 60000);

      if (now > windowEnd) {
        // Nova janela de tempo
        const newData = { attempts: 1, windowStart: now };
        await setSecureItem(key, newData, { encrypt: true });
        return { allowed: true, attempts: 1, resetAt: new Date(now + windowMinutes * 60000).toISOString() };
      }

      // Mesma janela de tempo
      const attempts = data.attempts + 1;
      const allowed = attempts <= maxAttempts;
      
      if (allowed) {
        const newData = { attempts, windowStart };
        await setSecureItem(key, newData, { encrypt: true });
      }

      return { 
        allowed, 
        attempts, 
        resetAt: new Date(windowEnd).toISOString() 
      };
    } catch (error) {
      console.error('Erro no rate limiting:', error);
      return { allowed: false, attempts: maxAttempts, resetAt: '' };
    }
  }, []);

  // Função para log de eventos de segurança
  const logSecurityEvent = useCallback(async (
    eventType: string,
    details?: Record<string, any>,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    try {
      // Verificar conectividade antes de tentar log
      const canExecute = await canExecuteOnlineOperation(networkStatus);
      if (!canExecute) {
        console.log('🌐 Offline - evento de segurança será logado localmente:', eventType);
        // TODO: Implementar queue local para logs offline
        return;
      }

      await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_details: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.pathname,
          ...details
        },
        p_severity: severity
      });
    } catch (error) {
      // Verificar se é erro de conectividade
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('🌐 Erro de conectividade - evento de segurança não foi logado:', eventType);
      } else {
        console.warn('Falha ao registrar evento de segurança:', error);
      }
    }
  }, [networkStatus]);

  // Função para verificar permissões do usuário
  const verifyPermissions = useCallback(async (options: OperationOptions = {}) => {
    // Verificar conectividade antes de operações que requerem rede
    const canExecute = await canExecuteOnlineOperation(networkStatus);
    if (!canExecute && (options.requireAdmin || options.requireEmailConfirmed)) {
      throw new Error('Operação requer conexão com a internet');
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    if (options.requireEmailConfirmed && !user.email_confirmed_at) {
      throw new Error('Email não confirmado');
    }

    if (options.requireAdmin) {
      if (!canExecute) {
        throw new Error('Verificação de permissão de admin requer conexão');
      }
      const { data: isAdmin } = await supabase.rpc('is_current_user_admin');
      if (!isAdmin) {
        throw new Error('Permissão de administrador necessária');
      }
    }

    return user;
  }, [networkStatus]);

  // Função wrapper para operações seguras
  const executeSecureOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    options: OperationOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    try {
      // 1. Verificar permissões
      const user = await verifyPermissions(options);

      // 2. Verificar rate limiting se especificado
      if (options.rateLimitKey) {
        const rateLimit = await checkRateLimit(
          user.id,
          options.rateLimitKey,
          10,
          15
        );

        if (!rateLimit.allowed) {
          await logSecurityEvent(
            `RATE_LIMIT_EXCEEDED_${operationName.toUpperCase()}`,
            { rateLimitKey: options.rateLimitKey },
            'high'
          );
          throw new Error(`Muitas tentativas. Tente novamente após ${rateLimit.resetAt}`);
        }
      }

      // 3. Log início da operação
      if (options.logEvent !== false) {
        await logSecurityEvent(
          `OPERATION_START_${operationName.toUpperCase()}`,
          { userId: user.id },
          'low'
        );
      }

      // 4. Executar operação
      const result = await operation();

      // 5. Log sucesso
      if (options.logEvent !== false) {
        await logSecurityEvent(
          `OPERATION_SUCCESS_${operationName.toUpperCase()}`,
          { userId: user.id },
          'low'
        );
      }

      return { success: true, data: result };

    } catch (error: any) {
      // Log erro
      if (options.logEvent !== false) {
        await logSecurityEvent(
          `OPERATION_FAILED_${operationName.toUpperCase()}`,
          { error: error.message },
          'medium'
        );
      }

      const errorMessage = error.message || 'Erro durante operação';
      showError({
        title: 'Erro na operação',
        description: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }, [verifyPermissions, checkRateLimit, logSecurityEvent, showError]);

  // Função para operações CRUD seguras
  const secureQuery = useCallback(async <T>(
    tableName: 'budgets' | 'clients' | 'user_profiles' | 'licenses' | 'admin_logs',
    operation: 'select' | 'insert' | 'update' | 'delete',
    queryBuilder: (query: any) => any,
    options: OperationOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    return executeSecureOperation(async () => {
      // Verificar conectividade antes de operações de banco
      const canExecute = await canExecuteOnlineOperation(networkStatus);
      if (!canExecute) {
        throw new Error('Operação de banco de dados requer conexão com a internet');
      }

      const query = supabase.from(tableName);
      const result = await queryBuilder(query);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data as T;
    }, `${operation}_${tableName}`, options);
  }, [executeSecureOperation, networkStatus]);

  // Função para chamar RPCs de forma segura (versão simplificada)
  const secureRPC = useCallback(async <T>(
    rpcName: string,
    params: any = {},
    options: OperationOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    return executeSecureOperation(async () => {
      // Verificar conectividade antes de chamadas RPC
      const canExecute = await canExecuteOnlineOperation(networkStatus);
      if (!canExecute) {
        throw new Error('Chamada RPC requer conexão com a internet');
      }

      // Chamar RPC diretamente sem verificações de tipo
      const response = await supabase.rpc(rpcName as any, params);
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data as T;
    }, `rpc_${rpcName}`, options);
  }, [executeSecureOperation, networkStatus]);

  // Função para operações em lote
  const secureBatchOperation = useCallback(async <T>(
    operations: Array<() => Promise<T>>,
    operationName: string,
    options: OperationOptions = {}
  ): Promise<{ success: boolean; results?: T[]; error?: string }> => {
    return executeSecureOperation(async () => {
      const results = [];
      
      for (const operation of operations) {
        const result = await operation();
        results.push(result);
      }

      return results;
    }, `batch_${operationName}`, options);
  }, [executeSecureOperation]);

  return {
    // Validação e sanitização
    validateInput,
    
    // Rate limiting
    checkRateLimit,
    
    // Logging
    logSecurityEvent,
    
    // Operações seguras
    executeSecureOperation,
    secureQuery,
    secureRPC,
    secureBatchOperation,
    
    // Verificações
    verifyPermissions,
  };
};