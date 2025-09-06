/**
 * Middleware de rotas com proteção centralizada
 * Implementa interceptação de navegação e cache inteligente
 */

import { multiTabCache } from '@/services/multiTabCache';
import { supabase } from '@/integrations/supabase/client';
import { ROUTE_CONFIG, isPublicRoute, requiresAuth, requiresLicense, requiresEmailConfirmation } from '@/config/routeConfig';
import { securityLogger } from '@/services/SecurityLogger';
import type { User } from '@supabase/supabase-js';

interface RouteProtection {
  requiresAuth: boolean;
  requiresEmailVerification: boolean;
  requiresLicense: boolean;
  requiredRole?: string;
  requiredPermission?: string;
  allowedRoles?: string[];
}

interface NavigationState {
  user: User | null;
  isEmailVerified: boolean;
  hasValidLicense: boolean;
  userRole: string | null;
  lastCheck: number;
  licenseStatus?: 'active' | 'inactive' | 'expired' | 'not_found';
  licenseExpiresAt?: string;
}

interface LicenseCheckResult {
  status: 'active' | 'inactive' | 'expired' | 'not_found';
  expiresAt?: string;
  lastCheck: number;
}

interface RouteConfig {
  [path: string]: RouteProtection;
}

class RouteMiddleware {
  private static instance: RouteMiddleware;
  private routeConfig: RouteConfig = {};
  private navigationState: NavigationState | null = null;
  private readonly CACHE_KEY = 'navigation-state';
  private lastStateCheck = 0;
  private pendingChecks = new Set<string>();
  // Configurações centralizadas
  private readonly config = ROUTE_CONFIG;

  private constructor() {
    this.setupDefaultRoutes();
    this.setupCacheListener();
  }

  static getInstance(): RouteMiddleware {
    if (!RouteMiddleware.instance) {
      RouteMiddleware.instance = new RouteMiddleware();
    }
    return RouteMiddleware.instance;
  }

  private setupDefaultRoutes() {
    // Configurações de rotas baseadas no arquivo de configuração centralizada
    this.routeConfig = {
      // Rotas que requerem apenas autenticação
      '/licenca': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: false },
      '/reset-email': { requiresAuth: true, requiresEmailVerification: false, requiresLicense: false },
      
      // Rotas protegidas (requerem licença válida)
      '/dashboard': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/painel': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/service-orders': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/service-orders/new': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/service-orders/settings': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/central-de-ajuda': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/msg': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      
      // Rotas administrativas
      '/admin': { 
        requiresAuth: true, 
        requiresEmailVerification: true, 
        requiresLicense: true,
        allowedRoles: ['admin', 'super_admin']
      }
    };
  }

  private setupCacheListener() {
    multiTabCache.addListener((key, data) => {
      if (key === this.CACHE_KEY) {
        this.navigationState = data;
        console.log('🔄 Estado de navegação atualizado via cache multi-tab');
      }
    });
  }

  /**
   * Obtém o estado atual de navegação com cache inteligente
   */
  private async getNavigationState(forceRefresh = false): Promise<NavigationState> {
    const now = Date.now();
    
    // Rate limiting
    if (!forceRefresh && now - this.lastStateCheck < this.config.rateLimit.windowMs) {
      if (this.navigationState) {
        return this.navigationState;
      }
    }

    // Tentar obter do cache primeiro
    if (!forceRefresh) {
      const cachedState = multiTabCache.get<NavigationState>(this.CACHE_KEY);
      if (cachedState && now - cachedState.lastCheck < this.config.cache.defaultTTL) {
        this.navigationState = cachedState;
        return cachedState;
      }
    }

    // Evitar múltiplas verificações simultâneas
    const checkId = `check-${now}`;
    if (this.pendingChecks.has(checkId)) {
      // Aguardar um pouco e tentar novamente
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.navigationState || this.getDefaultState();
    }

    this.pendingChecks.add(checkId);
    this.lastStateCheck = now;

    try {
      // Obter dados atuais do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      
      let hasValidLicense = false;
      let userRole: string | null = null;
      let licenseStatus: 'active' | 'inactive' | 'expired' | 'not_found' = 'not_found';
      let licenseExpiresAt: string | undefined;

      if (user) {
        // Verificar licença usando método detalhado
        try {
          const licenseCheck = await this.checkLicenseStatus(user.id);
          licenseStatus = licenseCheck.status;
          licenseExpiresAt = licenseCheck.expiresAt;
          hasValidLicense = licenseCheck.status === 'active';
        } catch (error) {
          console.warn('⚠️ Erro ao verificar licença:', error);
          hasValidLicense = false;
          licenseStatus = 'not_found';
        }

        // Obter role do usuário
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          userRole = profile?.role || 'user';
        } catch (error) {
          console.warn('⚠️ Erro ao obter role do usuário:', error);
          userRole = 'user';
        }
      }

      const newState: NavigationState = {
        user,
        isEmailVerified: !!user?.email_confirmed_at,
        hasValidLicense,
        userRole,
        lastCheck: now,
        licenseStatus,
        licenseExpiresAt
      };

      // Atualizar cache e estado local
      this.navigationState = newState;
      multiTabCache.set(this.CACHE_KEY, newState, this.config.cache.defaultTTL);

      return newState;
    } catch (error) {
      console.error('❌ Erro ao obter estado de navegação:', error);
      return this.getDefaultState();
    } finally {
      this.pendingChecks.delete(checkId);
    }
  }

  private getDefaultState(): NavigationState {
    return {
      user: null,
      isEmailVerified: false,
      hasValidLicense: false,
      userRole: null,
      lastCheck: Date.now()
    };
  }

  /**
   * Verifica se o usuário pode acessar uma rota específica
   */
  async canAccessRoute(path: string, forceRefresh = false): Promise<{
    canAccess: boolean;
    redirectTo?: string;
    reason?: string;
    licenseStatus?: 'active' | 'inactive' | 'expired' | 'not_found';
  }> {
    // Normalizar path
    const normalizedPath = this.normalizePath(path);
    const protection = this.getRouteProtection(normalizedPath);
    
    // Verificar se é rota pública
    if (isPublicRoute(path)) {
      return { canAccess: true };
    }

    // Se não há proteção definida, permitir acesso
    if (!protection) {
      return { canAccess: true };
    }

    const state = await this.getNavigationState(forceRefresh);

    // Verificar autenticação
    if (!state.user && requiresAuth(path)) {
      return {
        canAccess: false,
        redirectTo: this.config.redirects.unauthenticated,
        reason: 'Usuário não autenticado'
      };
    }

    // Verificar email confirmado
    if (state.user && !state.user.email_confirmed_at && requiresEmailConfirmation(path)) {
      return {
        canAccess: false,
        redirectTo: this.config.redirects.emailNotConfirmed,
        reason: 'Email não confirmado'
      };
    }

    // Verificar licença (apenas para rotas que precisam)
    if (requiresLicense(path) && path !== '/licenca' && path !== '/verify-licenca') {
      if (state.user) {
        const licenseCheck = await this.checkLicenseStatus(state.user.id);
        
        if (licenseCheck.status === 'inactive') {
          // Log de tentativa de acesso não autorizado
          this.logUnauthorizedAccess(state.user.id, path, 'inactive_license');
          
          // Registrar redirecionamento automático
          try {
            await securityLogger.logAutoRedirect(
              state.user.id,
              path,
              '/verify-licenca',
              'Licença inativa'
            );
          } catch (error) {
            console.warn('⚠️ [RouteMiddleware] Falha ao registrar redirecionamento:', error);
          }
          
          return {
            canAccess: false,
            redirectTo: '/verify-licenca',
            reason: 'Licença inativa - verifique sua liçença',
            licenseStatus: 'inactive'
          };
        }
        
        if (licenseCheck.status === 'expired') {
          this.logUnauthorizedAccess(state.user.id, path, 'expired_license');
          
          // Registrar redirecionamento automático
          try {
            await securityLogger.logAutoRedirect(
              state.user.id,
              path,
              '/verify-licenca',
              'Licença expirada'
            );
          } catch (error) {
            console.warn('⚠️ [RouteMiddleware] Falha ao registrar redirecionamento:', error);
          }
          
          return {
            canAccess: false,
            redirectTo: '/verify-licenca',
            reason: 'Licença expirada - redirecionando para verificação',
            licenseStatus: 'expired'
          };
        }
        
        if (licenseCheck.status === 'not_found') {
          this.logUnauthorizedAccess(state.user.id, path, 'no_license');
          
          // Registrar redirecionamento automático
          try {
            await securityLogger.logAutoRedirect(
              state.user.id,
              path,
              this.config.redirects.invalidLicense,
              'Nenhuma licença encontrada'
            );
          } catch (error) {
            console.warn('⚠️ [RouteMiddleware] Falha ao registrar redirecionamento:', error);
          }
          
          return {
            canAccess: false,
            redirectTo: this.config.redirects.invalidLicense,
            reason: 'Nenhuma licença encontrada',
            licenseStatus: 'not_found'
          };
        }
      } else {
        return {
          canAccess: false,
          redirectTo: this.config.redirects.invalidLicense,
          reason: 'Licença inválida ou expirada'
        };
      }
    }

    // Verificar roles
    if (protection.allowedRoles && state.userRole) {
      if (!protection.allowedRoles.includes(state.userRole)) {
        return {
          canAccess: false,
          redirectTo: '/unauthorized',
          reason: `Role '${state.userRole}' não autorizada`
        };
      }
    }

    return { canAccess: true };
  }

  /**
   * Normaliza o path da rota
   */
  private normalizePath(path: string): string {
    // Remover query params e hash
    const cleanPath = path.split('?')[0].split('#')[0];
    
    // Verificar padrões dinâmicos
    for (const routePath of Object.keys(this.routeConfig)) {
      if (this.matchesPattern(cleanPath, routePath)) {
        return routePath;
      }
    }
    
    return cleanPath;
  }

  /**
   * Verifica se um path corresponde a um padrão de rota
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Converter padrão para regex
    const regexPattern = pattern
      .replace(/:[^/]+/g, '[^/]+') // :id -> [^/]+
      .replace(/\*/g, '.*'); // * -> .*
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Obtém a proteção de uma rota
   */
  private getRouteProtection(path: string): RouteProtection | null {
    // Busca exata primeiro
    if (this.routeConfig[path]) {
      return this.routeConfig[path];
    }

    // Busca por padrões
    for (const [routePath, protection] of Object.entries(this.routeConfig)) {
      if (this.matchesPattern(path, routePath)) {
        return protection;
      }
    }

    // Rotas não configuradas são protegidas por padrão
    return {
      requiresAuth: true,
      requiresEmailVerification: true,
      requiresLicense: true
    };
  }

  /**
   * Invalida o cache de estado de navegação
   */
  invalidateState(): void {
    this.navigationState = null;
    multiTabCache.invalidate(this.CACHE_KEY);
  }

  /**
   * Verifica o status detalhado da licença do usuário usando a função RPC
   */
  private async checkLicenseStatus(userId: string): Promise<LicenseCheckResult> {
    try {
      // Usar a função RPC get_user_license_status (read-only para evitar loops)
      const { data: licenseData, error } = await supabase
        .rpc('get_user_license_status', { p_user_id: userId });
      
      if (error) {
        console.error('❌ [RouteMiddleware] Erro na função RPC validate_user_license_complete:', error);
        const result = { status: 'not_found' as const, lastCheck: Date.now() };
        
        // Registrar erro na verificação de licença
        try {
          await securityLogger.logLicenseCheck(userId, result.status, 'route_middleware_rpc_error');
        } catch (logError) {
          console.warn('⚠️ [RouteMiddleware] Falha ao registrar erro de verificação de licença:', logError);
        }
        
        return result;
      }
      
      if (!licenseData) {
        const result = { status: 'not_found' as const, lastCheck: Date.now() };
        
        // Log da verificação de licença
        console.log(`🔍 [RouteMiddleware] Verificação de licença para usuário ${userId}: ${result.status}`);
        
        // Registrar a verificação de licença no SecurityLogger
        try {
          await securityLogger.logLicenseCheck(userId, result.status, 'route_middleware_check');
        } catch (error) {
          console.warn('⚠️ [RouteMiddleware] Falha ao registrar verificação de licença:', error);
        }
        
        return result;
      }
      
      // Determinar status baseado nos dados da função RPC
      let status: 'active' | 'inactive' | 'expired' | 'not_found';
      
      if (!licenseData.has_license) {
        status = 'not_found';
      } else if (licenseData.requires_renewal) {
        status = 'expired';
      } else if (!licenseData.is_valid || licenseData.requires_activation) {
        status = 'inactive';
      } else {
        status = 'active';
      }
      
      const result = {
        status,
        expiresAt: licenseData.expires_at,
        lastCheck: Date.now()
      };
      
      // Log da verificação de licença
      console.log(`🔍 [RouteMiddleware] Verificação de licença para usuário ${userId}: ${result.status} (RPC: has_license=${licenseData.has_license}, is_valid=${licenseData.is_valid}, requires_activation=${licenseData.requires_activation}, requires_renewal=${licenseData.requires_renewal})`);
      
      // Registrar a verificação de licença no SecurityLogger
      try {
        await securityLogger.logLicenseCheck(userId, result.status, 'route_middleware_rpc_check');
      } catch (error) {
        console.warn('⚠️ [RouteMiddleware] Falha ao registrar verificação de licença:', error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erro ao verificar status da licença:', error);
      const result = { status: 'not_found' as const, lastCheck: Date.now() };
      
      // Registrar erro na verificação de licença
      try {
        await securityLogger.logLicenseCheck(userId, result.status, 'route_middleware_error');
      } catch (logError) {
        console.warn('⚠️ [RouteMiddleware] Falha ao registrar erro de verificação de licença:', logError);
      }
      
      return result;
    }
  }

  /**
   * Registra tentativas de acesso não autorizado
   */
  private logUnauthorizedAccess(userId: string, attemptedPath: string, reason: string): void {
    // Implementar log assíncrono para não bloquear a navegação
    setTimeout(async () => {
      try {
        await securityLogger.logUnauthorizedAccess(userId, attemptedPath, reason);
      } catch (error) {
        console.warn('⚠️ Falha ao registrar tentativa de acesso:', error);
      }
    }, 0);
  }

  /**
   * Adiciona ou atualiza proteção de rota
   */
  setRouteProtection(path: string, protection: RouteProtection): void {
    this.routeConfig[path] = protection;
  }

  /**
   * Obtém estatísticas do middleware
   */
  getStats() {
    return {
      routesConfigured: Object.keys(this.routeConfig).length,
      cacheStats: multiTabCache.getStats(),
      lastStateCheck: this.lastStateCheck,
      pendingChecks: this.pendingChecks.size
    };
  }
}

// Instância singleton
export const routeMiddleware = RouteMiddleware.getInstance();

export default RouteMiddleware;