/**
 * Script para testar o fluxo completo de autenticação e acesso às rotas
 * Simula exatamente o que acontece no UnifiedProtectionGuard
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://rnpkqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucGtxanFqcWpxanFqcWpxanFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI2NzQsImV4cCI6MjA1MDU0ODY3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';
const supabase = createClient(supabaseUrl, supabaseKey);

// Simulação das configurações de rota
const routeConfig = {
  publicRoutes: ['/login', '/register', '/verify-email', '/reset-password', '/licenca'],
  authRequiredRoutes: ['/dashboard', '/painel', '/profile', '/settings'],
  licenseRequiredRoutes: ['/dashboard', '/painel'],
  emailConfirmationRequiredRoutes: ['/dashboard', '/painel'],
  redirects: {
    login: '/login',
    emailConfirmation: '/verify-email',
    invalidLicense: '/licenca'
  }
};

// Simulação do cache multi-tab
class MultiTabCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data, ttlMs = 30000) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  invalidate(key) {
    this.cache.delete(key);
  }
}

const multiTabCache = new MultiTabCache();

// Simulação do RouteMiddleware
class RouteMiddleware {
  constructor() {
    this.CACHE_KEY = 'navigation_state';
    this.navigationState = null;
  }

  async checkLicenseStatus(userId) {
    try {
      const { data: licenseData, error } = await supabase
        .rpc('validate_user_license_complete', { p_user_id: userId });

      if (error) {
        console.error('❌ Erro na RPC validate_user_license_complete:', error);
        return { status: 'not_found', error: error.message };
      }

      if (!licenseData) {
        return { status: 'not_found' };
      }

      if (!licenseData.has_license) {
        return { status: 'not_found' };
      }

      if (!licenseData.is_valid) {
        if (licenseData.requires_activation) {
          return { status: 'inactive' };
        }
        if (licenseData.requires_renewal) {
          return { status: 'expired' };
        }
        return { status: 'inactive' };
      }

      return { status: 'active', data: licenseData };
    } catch (error) {
      console.error('❌ Erro inesperado na verificação de licença:', error);
      return { status: 'not_found', error: error.message };
    }
  }

  async canAccessRoute(path, user) {
    console.log(`\n🔍 Verificando acesso à rota: ${path}`);
    console.log(`👤 Usuário: ${user?.id || 'não autenticado'}`);

    // Verificar se é rota pública
    if (routeConfig.publicRoutes.includes(path)) {
      console.log('✅ Rota pública - acesso permitido');
      return { canAccess: true };
    }

    // Verificar autenticação
    if (!user?.id) {
      console.log('❌ Usuário não autenticado');
      return {
        canAccess: false,
        redirectTo: routeConfig.redirects.login,
        reason: 'not_authenticated'
      };
    }

    // Verificar confirmação de email
    if (routeConfig.emailConfirmationRequiredRoutes.includes(path) && !user.email_confirmed_at) {
      console.log('❌ Email não confirmado');
      return {
        canAccess: false,
        redirectTo: routeConfig.redirects.emailConfirmation,
        reason: 'email_not_confirmed'
      };
    }

    // Verificar licença
    if (routeConfig.licenseRequiredRoutes.includes(path)) {
      console.log('🔐 Verificando licença...');
      const licenseResult = await this.checkLicenseStatus(user.id);
      console.log(`📋 Status da licença: ${licenseResult.status}`);

      if (licenseResult.status !== 'active') {
        console.log('❌ Licença inválida - redirecionando para /licenca');
        return {
          canAccess: false,
          redirectTo: routeConfig.redirects.invalidLicense,
          reason: 'invalid_license',
          licenseStatus: licenseResult.status
        };
      }

      console.log('✅ Licença válida');
    }

    console.log('✅ Acesso permitido');
    return { canAccess: true };
  }
}

async function testCompleteFlow() {
  console.log('🧪 Testando fluxo completo de acesso às rotas...');
  console.log('=' .repeat(60));

  const middleware = new RouteMiddleware();

  try {
    // Buscar usuários com licenças ativas
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('user_id, code, is_active, expires_at')
      .eq('is_active', true)
      .limit(2);

    if (error) {
      console.error('❌ Erro ao buscar licenças:', error);
      return;
    }

    if (!licenses || licenses.length === 0) {
      console.log('⚠️ Nenhuma licença ativa encontrada');
      return;
    }

    for (const license of licenses) {
      console.log(`\n🔍 Testando usuário: ${license.user_id}`);
      console.log(`   📄 Código da licença: ${license.code}`);

      // Simular usuário autenticado com email confirmado
      const mockUser = {
        id: license.user_id,
        email_confirmed_at: new Date().toISOString()
      };

      // Testar acesso às rotas problemáticas
      const dashboardResult = await middleware.canAccessRoute('/dashboard', mockUser);
      const painelResult = await middleware.canAccessRoute('/painel', mockUser);

      console.log(`\n📊 Resultados para usuário ${license.user_id}:`);
      console.log(`   /dashboard: ${dashboardResult.canAccess ? '✅ PERMITIDO' : '❌ NEGADO'}`);
      if (!dashboardResult.canAccess) {
        console.log(`     - Motivo: ${dashboardResult.reason}`);
        console.log(`     - Redirecionamento: ${dashboardResult.redirectTo}`);
        console.log(`     - Status da licença: ${dashboardResult.licenseStatus}`);
      }

      console.log(`   /painel: ${painelResult.canAccess ? '✅ PERMITIDO' : '❌ NEGADO'}`);
      if (!painelResult.canAccess) {
        console.log(`     - Motivo: ${painelResult.reason}`);
        console.log(`     - Redirecionamento: ${painelResult.redirectTo}`);
        console.log(`     - Status da licença: ${painelResult.licenseStatus}`);
      }

      // Se o acesso foi negado, isso indica o problema!
      if (!dashboardResult.canAccess || !painelResult.canAccess) {
        console.log('\n🚨 PROBLEMA IDENTIFICADO!');
        console.log('   Usuário com licença ativa está sendo negado acesso!');
      }
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }

  console.log('\n✅ Teste do fluxo completo concluído');
}

testCompleteFlow();