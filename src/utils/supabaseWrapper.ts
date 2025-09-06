/**
 * Wrapper para o cliente Supabase com fallbacks para conectividade
 * Implementa cache local e operações offline
 */

import { supabase } from '@/integrations/supabase/client';
import { canExecuteOnlineOperation } from './networkUtils';
import { setSecureItem, getSecureItem } from './secureStorage';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
}

interface OfflineOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}

class SupabaseWrapper {
  private cache = new Map<string, CacheEntry>();
  private offlineQueue: OfflineOperation[] = [];
  private readonly CACHE_PREFIX = 'supabase_cache_';
  private readonly OFFLINE_QUEUE_KEY = 'supabase_offline_queue';
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.loadOfflineQueue();
    this.setupPeriodicSync();
  }

  /**
   * Executa uma query com fallback para cache
   */
  async query(table: string, options: any = {}) {
    const cacheKey = this.generateCacheKey(table, options);
    
    // Tentar operação online primeiro
    if (canExecuteOnlineOperation()) {
      try {
        const result = await supabase.from(table).select(options.select || '*');
        
        if (!result.error) {
          // Salvar no cache
          this.setCache(cacheKey, result.data, this.DEFAULT_TTL);
          return result;
        }
      } catch (error) {
        console.warn('Supabase query failed, trying cache:', error);
      }
    }

    // Fallback para cache
    const cachedData = this.getCache(cacheKey);
    if (cachedData) {
      return {
        data: cachedData,
        error: null,
        status: 200,
        statusText: 'OK (from cache)'
      };
    }

    // Se não há cache, retornar erro
    return {
      data: null,
      error: { message: 'No network connection and no cached data available' },
      status: 0,
      statusText: 'Offline'
    };
  }

  /**
   * Executa uma operação de inserção com queue offline
   */
  async insert(table: string, data: any) {
    if (canExecuteOnlineOperation()) {
      try {
        const result = await supabase.from(table).insert(data);
        if (!result.error) {
          return result;
        }
      } catch (error) {
        console.warn('Supabase insert failed, queuing for later:', error);
      }
    }

    // Adicionar à queue offline
    const operation: OfflineOperation = {
      id: this.generateOperationId(),
      type: 'insert',
      table,
      data,
      timestamp: Date.now()
    };

    this.offlineQueue.push(operation);
    this.saveOfflineQueue();

    return {
      data: null,
      error: null,
      status: 202,
      statusText: 'Queued for sync'
    };
  }

  /**
   * Executa uma operação de atualização com queue offline
   */
  async update(table: string, data: any, filter: any) {
    if (canExecuteOnlineOperation()) {
      try {
        const result = await supabase.from(table).update(data).match(filter);
        if (!result.error) {
          return result;
        }
      } catch (error) {
        console.warn('Supabase update failed, queuing for later:', error);
      }
    }

    // Adicionar à queue offline
    const operation: OfflineOperation = {
      id: this.generateOperationId(),
      type: 'update',
      table,
      data: { ...data, filter },
      timestamp: Date.now()
    };

    this.offlineQueue.push(operation);
    this.saveOfflineQueue();

    return {
      data: null,
      error: null,
      status: 202,
      statusText: 'Queued for sync'
    };
  }

  /**
   * Executa uma operação de exclusão com queue offline
   */
  async delete(table: string, filter: any) {
    if (canExecuteOnlineOperation()) {
      try {
        const result = await supabase.from(table).delete().match(filter);
        if (!result.error) {
          return result;
        }
      } catch (error) {
        console.warn('Supabase delete failed, queuing for later:', error);
      }
    }

    // Adicionar à queue offline
    const operation: OfflineOperation = {
      id: this.generateOperationId(),
      type: 'delete',
      table,
      data: { filter },
      timestamp: Date.now()
    };

    this.offlineQueue.push(operation);
    this.saveOfflineQueue();

    return {
      data: null,
      error: null,
      status: 202,
      statusText: 'Queued for sync'
    };
  }

  /**
   * Executa RPC com fallback
   */
  async rpc(functionName: string, params: any = {}) {
    const cacheKey = this.generateCacheKey(`rpc_${functionName}`, params);
    
    if (canExecuteOnlineOperation()) {
      try {
        const result = await supabase.rpc(functionName, params);
        if (!result.error) {
          // Cache apenas para funções de leitura
          if (functionName.startsWith('get_') || functionName.includes('select')) {
            this.setCache(cacheKey, result.data, this.DEFAULT_TTL);
          }
          return result;
        }
      } catch (error) {
        console.warn('Supabase RPC failed, trying cache:', error);
      }
    }

    // Fallback para cache apenas para funções de leitura
    if (functionName.startsWith('get_') || functionName.includes('select')) {
      const cachedData = this.getCache(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          error: null,
          status: 200,
          statusText: 'OK (from cache)'
        };
      }
    }

    return {
      data: null,
      error: { message: 'No network connection and operation cannot be cached' },
      status: 0,
      statusText: 'Offline'
    };
  }

  /**
   * Sincroniza operações offline quando a conectividade retorna
   */
  async syncOfflineOperations() {
    if (!canExecuteOnlineOperation() || this.offlineQueue.length === 0) {
      return;
    }

    const operations = [...this.offlineQueue];
    const successfulOperations: string[] = [];

    for (const operation of operations) {
      try {
        let result;
        
        switch (operation.type) {
          case 'insert':
            result = await supabase.from(operation.table).insert(operation.data);
            break;
          case 'update':
            const { filter, ...updateData } = operation.data;
            result = await supabase.from(operation.table).update(updateData).match(filter);
            break;
          case 'delete':
            result = await supabase.from(operation.table).delete().match(operation.data.filter);
            break;
        }

        if (!result?.error) {
          successfulOperations.push(operation.id);
        }
      } catch (error) {
        console.warn('Failed to sync operation:', operation, error);
      }
    }

    // Remover operações sincronizadas com sucesso
    this.offlineQueue = this.offlineQueue.filter(
      op => !successfulOperations.includes(op.id)
    );
    this.saveOfflineQueue();

    return {
      synced: successfulOperations.length,
      remaining: this.offlineQueue.length
    };
  }

  /**
   * Limpa cache expirado
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Obtém estatísticas do wrapper
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      offlineQueueSize: this.offlineQueue.length,
      isOnline: canExecuteOnlineOperation()
    };
  }

  // Métodos privados
  private generateCacheKey(table: string, options: any): string {
    return `${this.CACHE_PREFIX}${table}_${JSON.stringify(options)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setCache(key: string, data: any, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private saveOfflineQueue() {
    try {
      setSecureItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.warn('Failed to save offline queue:', error);
    }
  }

  private loadOfflineQueue() {
    try {
      const saved = getSecureItem(this.OFFLINE_QUEUE_KEY);
      if (saved) {
        this.offlineQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }

  private setupPeriodicSync() {
    // Tentar sincronizar a cada 30 segundos
    setInterval(() => {
      this.syncOfflineOperations();
      this.clearExpiredCache();
    }, 30000);
  }
}

// Instância singleton
export const supabaseWrapper = new SupabaseWrapper();

// Exportar métodos principais para facilitar o uso
export const {
  query: supabaseQuery,
  insert: supabaseInsert,
  update: supabaseUpdate,
  delete: supabaseDelete,
  rpc: supabaseRpc,
  syncOfflineOperations,
  getStats: getSupabaseStats
} = supabaseWrapper;