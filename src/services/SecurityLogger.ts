import { supabase } from '../integrations/supabase/client';
import { canExecuteOnlineOperation, useNetworkStatus } from '../utils/networkUtils';

interface AccessLogEntry {
  user_id: string;
  attempted_path: string;
  reason: string;
  timestamp: string;
  user_agent: string;
  ip_address?: string;
  session_id?: string;
  additional_data?: Record<string, any>;
}

interface UserActivityLogEntry {
  user_id: string;
  activity_type: 'login' | 'logout' | 'license_check' | 'access_denied' | 'redirect';
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
  ip_address?: string;
  user_agent: string;
}

/**
 * Serviço centralizado para logging de segurança e atividades do usuário
 * Implementa logging assíncrono para não impactar a performance
 */
class SecurityLogger {
  private static instance: SecurityLogger;
  private logQueue: Array<AccessLogEntry | UserActivityLogEntry> = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 segundos
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startPeriodicFlush();
  }

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Registra tentativa de acesso não autorizado
   */
  async logUnauthorizedAccess(
    userId: string,
    attemptedPath: string,
    reason: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const logEntry: AccessLogEntry = {
      user_id: userId,
      attempted_path: attemptedPath,
      reason: reason,
      timestamp: new Date().toISOString(),
      user_agent: this.getUserAgent(),
      session_id: this.getSessionId(),
      additional_data: additionalData
    };

    this.addToQueue(logEntry);
    
    // Log no console para debug
    console.warn(`🚫 [SecurityLogger] Acesso negado: ${reason} - Usuário: ${userId} - Rota: ${attemptedPath}`);
  }

  /**
   * Registra atividade do usuário
   */
  async logUserActivity(
    userId: string,
    activityType: UserActivityLogEntry['activity_type'],
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const logEntry: UserActivityLogEntry = {
      user_id: userId,
      activity_type: activityType,
      description: description,
      metadata: metadata,
      timestamp: new Date().toISOString(),
      user_agent: this.getUserAgent()
    };

    this.addToQueue(logEntry);
    
    // Log no console para debug
    console.info(`📊 [SecurityLogger] Atividade: ${activityType} - ${description} - Usuário: ${userId}`);
  }

  /**
   * Registra tentativa de acesso com licença inativa
   */
  async logInactiveLicenseAccess(
    userId: string,
    attemptedPath: string,
    licenseStatus: 'inactive' | 'expired' | 'not_found'
  ): Promise<void> {
    await this.logUnauthorizedAccess(
      userId,
      attemptedPath,
      `license_${licenseStatus}`,
      {
        license_status: licenseStatus,
        redirect_to: '/verify-licenca'
      }
    );

    await this.logUserActivity(
      userId,
      'access_denied',
      `Acesso negado por licença ${licenseStatus}`,
      {
        attempted_path: attemptedPath,
        license_status: licenseStatus
      }
    );
  }

  /**
   * Registra redirecionamento automático
   */
  async logAutoRedirect(
    userId: string,
    fromPath: string,
    toPath: string,
    reason: string
  ): Promise<void> {
    await this.logUserActivity(
      userId,
      'redirect',
      `Redirecionamento automático: ${fromPath} → ${toPath}`,
      {
        from_path: fromPath,
        to_path: toPath,
        reason: reason
      }
    );
  }

  /**
   * Registra verificação de licença
   */
  async logLicenseCheck(
    userId: string,
    licenseStatus: 'active' | 'inactive' | 'expired' | 'not_found',
    checkReason: string = 'routine_check'
  ): Promise<void> {
    await this.logUserActivity(
      userId,
      'license_check',
      `Verificação de licença: ${licenseStatus}`,
      {
        license_status: licenseStatus,
        check_reason: checkReason
      }
    );
  }

  /**
   * Adiciona entrada à fila de processamento
   */
  private addToQueue(entry: AccessLogEntry | UserActivityLogEntry): void {
    this.logQueue.push(entry);
    
    // Se a fila está cheia, processar imediatamente
    if (this.logQueue.length >= this.BATCH_SIZE) {
      this.flushQueue();
    }
  }

  /**
   * Processa a fila de logs
   */
  private async flushQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    // Verificar conectividade antes de tentar processar
    const networkStatus = { isOnline: navigator.onlineEvent !== false, isSupabaseConnected: true };
    if (!canExecuteOnlineOperation(networkStatus)) {
      console.log('⚠️ [SecurityLogger] Offline - adiando processamento da fila');
      return;
    }

    this.isProcessing = true;
    const batch = this.logQueue.splice(0, this.BATCH_SIZE);

    try {
      // Separar logs por tipo
      const accessLogs = batch.filter(entry => 'attempted_path' in entry) as AccessLogEntry[];
      const activityLogs = batch.filter(entry => 'activity_type' in entry) as UserActivityLogEntry[];

      // Inserir logs de acesso
      if (accessLogs.length > 0) {
        const { error: accessError } = await supabase
          .from('access_logs')
          .insert(accessLogs);

        if (accessError) {
          console.error('❌ [SecurityLogger] Erro ao inserir access_logs:', accessError);
          // Verificar se é erro de conectividade
          if (this.isNetworkError(accessError)) {
            console.log('🌐 [SecurityLogger] Erro de rede detectado - recolocando access_logs na fila');
            this.logQueue.unshift(...accessLogs);
          } else {
            console.error('💾 [SecurityLogger] Erro de dados - salvando access_logs localmente');
            this.saveToLocalStorage('access_logs', accessLogs);
          }
        } else {
          console.log(`✅ [SecurityLogger] ${accessLogs.length} access_logs inseridos`);
        }
      }

      // Inserir logs de atividade
      if (activityLogs.length > 0) {
        const { error: activityError } = await supabase
          .from('user_activity_logs')
          .insert(activityLogs);

        if (activityError) {
          console.error('❌ [SecurityLogger] Erro ao inserir user_activity_logs:', activityError);
          // Verificar se é erro de conectividade
          if (this.isNetworkError(activityError)) {
            console.log('🌐 [SecurityLogger] Erro de rede detectado - recolocando user_activity_logs na fila');
            this.logQueue.unshift(...activityLogs);
          } else {
            console.error('💾 [SecurityLogger] Erro de dados - salvando user_activity_logs localmente');
            this.saveToLocalStorage('user_activity_logs', activityLogs);
          }
        } else {
          console.log(`✅ [SecurityLogger] ${activityLogs.length} user_activity_logs inseridos`);
        }
      }
    } catch (error) {
      console.error('❌ [SecurityLogger] Erro geral ao processar fila:', error);
      
      // Verificar se é erro de conectividade
      if (this.isNetworkError(error)) {
        console.log('🌐 [SecurityLogger] Erro de rede geral - recolocando todos os logs na fila');
        this.logQueue.unshift(...batch);
      } else {
        console.error('💾 [SecurityLogger] Erro geral - salvando logs localmente');
        this.saveToLocalStorage('mixed_logs', batch);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Inicia o flush periódico da fila
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushQueue();
    }, this.FLUSH_INTERVAL);
    
    // Tentar recuperar logs locais na inicialização
    setTimeout(() => {
      this.recoverLocalLogs();
    }, 2000); // Aguardar 2 segundos para garantir que a aplicação inicializou
  }

  /**
   * Para o flush periódico
   */
  public stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Força o processamento imediato da fila
   */
  public async forceFlush(): Promise<void> {
    await this.flushQueue();
  }

  /**
   * Obtém o User Agent do navegador
   */
  private getUserAgent(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return 'Unknown';
  }

  /**
   * Obtém o ID da sessão atual
   */
  private getSessionId(): string | undefined {
    // Tentar obter da sessão do Supabase
    try {
      const session = supabase.auth.getSession();
      return session ? 'supabase_session' : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Obtém estatísticas do logger
   */
  public getStats(): {
    queueSize: number;
    isProcessing: boolean;
    flushInterval: number;
    batchSize: number;
  } {
    return {
      queueSize: this.logQueue.length,
      isProcessing: this.isProcessing,
      flushInterval: this.FLUSH_INTERVAL,
      batchSize: this.BATCH_SIZE
    };
  }

  /**
   * Verifica se o erro é relacionado à conectividade de rede
   */
  private isNetworkError(error: any): boolean {
    if (!error) return false;
    
    // Verificar mensagens de erro comuns de rede
    const errorMessage = error.message || error.toString() || '';
    const networkErrorPatterns = [
      'Failed to fetch',
      'NetworkError',
      'fetch',
      'NETWORK_ERROR',
      'CONNECTION_ERROR',
      'TIMEOUT',
      'net::ERR_',
      'offline'
    ];
    
    return networkErrorPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Salva logs no localStorage como fallback
   */
  private saveToLocalStorage(type: string, logs: any[]): void {
    try {
      const key = `security_logs_${type}_${Date.now()}`;
      const data = {
        type,
        logs,
        timestamp: new Date().toISOString(),
        count: logs.length
      };
      
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`💾 [SecurityLogger] ${logs.length} logs salvos localmente: ${key}`);
      
      // Limitar o número de entradas no localStorage (máximo 50)
      this.cleanupLocalStorage();
    } catch (error) {
      console.error('❌ [SecurityLogger] Erro ao salvar no localStorage:', error);
    }
  }

  /**
   * Limpa entradas antigas do localStorage
   */
  private cleanupLocalStorage(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('security_logs_'));
      
      if (keys.length > 50) {
        // Ordenar por timestamp e remover os mais antigos
        keys.sort().slice(0, keys.length - 50).forEach(key => {
          localStorage.removeItem(key);
        });
        console.log(`🧹 [SecurityLogger] ${keys.length - 50} entradas antigas removidas do localStorage`);
      }
    } catch (error) {
      console.error('❌ [SecurityLogger] Erro ao limpar localStorage:', error);
    }
  }

  /**
   * Recupera logs salvos localmente e tenta enviá-los novamente
   */
  public async recoverLocalLogs(): Promise<void> {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('security_logs_'));
      
      if (keys.length === 0) {
        console.log('📭 [SecurityLogger] Nenhum log local para recuperar');
        return;
      }
      
      console.log(`🔄 [SecurityLogger] Recuperando ${keys.length} entradas de logs locais`);
      
      for (const key of keys) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.logs && Array.isArray(data.logs)) {
            // Adicionar logs de volta à fila
            this.logQueue.push(...data.logs);
            localStorage.removeItem(key);
            console.log(`✅ [SecurityLogger] ${data.logs.length} logs recuperados de ${key}`);
          }
        } catch (error) {
          console.error(`❌ [SecurityLogger] Erro ao recuperar ${key}:`, error);
          localStorage.removeItem(key); // Remove entrada corrompida
        }
      }
      
      // Tentar processar os logs recuperados
      if (this.logQueue.length > 0) {
        await this.flushQueue();
      }
    } catch (error) {
      console.error('❌ [SecurityLogger] Erro ao recuperar logs locais:', error);
    }
  }

  /**
   * Limpa a fila de logs (usar com cuidado)
   */
  public clearQueue(): void {
    this.logQueue = [];
    console.warn('⚠️ [SecurityLogger] Fila de logs limpa');
  }
}

// Instância singleton
export const securityLogger = SecurityLogger.getInstance();

export default SecurityLogger;