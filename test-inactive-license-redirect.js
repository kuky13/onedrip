/**
 * Script de teste para verificar redirecionamento de usuários com licenças inativas
 * para /verify-licenca
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://oghjlypdnmqecaavekyr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Simulação da configuração de rotas
const routeConfig = {
  protectedRoutes: {
    '/dashboard': {
      requiresAuth: true,
      requiresLicense: true,
      role: 'user',
      permission: 'read'
    },
    '/painel': {
      requiresAuth: true,
      requiresLicense: true,
      role: 'user',
      permission: 'read'
    }
  },
  redirects: {
    inactiveLicense: '/verify-licenca',
    expiredLicense: '/verify-licenca',
    invalidLicense: '/licenca'
  }
};

// Simulação do RouteMiddleware
class TestRouteMiddleware {
  constructor(config) {
    this.config = config;
  }

  async checkLicenseStatus(userId) {
    try {
      console.log(`🔍 Verificando status da licença para usuário: ${userId}`);
      
      const { data, error } = await supabase.rpc('validate_user_license_complete', {
        p_user_id: userId
      });

      if (error) {
        console.error('❌ Erro ao verificar licença:', error);
        return { status: 'error', error };
      }

      console.log(`📋 Status da licença:`, data);
      return data;
    } catch (error) {
      console.error('❌ Erro na verificação de licença:', error);
      return { status: 'error', error };
    }
  }

  async canAccessRoute(route, userId) {
    console.log(`\n🛡️ Verificando acesso à rota: ${route} para usuário: ${userId}`);
    
    const routeProtection = this.config.protectedRoutes[route];
    if (!routeProtection) {
      console.log(`✅ Rota ${route} não protegida - acesso permitido`);
      return { canAccess: true };
    }

    if (routeProtection.requiresLicense) {
      const licenseStatus = await this.checkLicenseStatus(userId);
      
      if (licenseStatus.status === 'error') {
        console.log(`❌ Erro na verificação - redirecionando para ${this.config.redirects.invalidLicense}`);
        return {
          canAccess: false,
          redirect: this.config.redirects.invalidLicense,
          reason: 'license_check_error'
        };
      }

      switch (licenseStatus.status) {
        case 'active':
          console.log(`✅ Licença ativa - acesso permitido à ${route}`);
          return { canAccess: true };
        
        case 'inactive':
          console.log(`⚠️ Licença inativa - redirecionando para ${this.config.redirects.inactiveLicense}`);
          return {
            canAccess: false,
            redirect: this.config.redirects.inactiveLicense,
            reason: 'inactive_license'
          };
        
        case 'expired':
          console.log(`⏰ Licença expirada - redirecionando para ${this.config.redirects.expiredLicense}`);
          return {
            canAccess: false,
            redirect: this.config.redirects.expiredLicense,
            reason: 'expired_license'
          };
        
        case 'not_found':
          console.log(`🚫 Licença não encontrada - redirecionando para ${this.config.redirects.invalidLicense}`);
          return {
            canAccess: false,
            redirect: this.config.redirects.invalidLicense,
            reason: 'no_license'
          };
        
        default:
          console.log(`❓ Status desconhecido: ${licenseStatus.status} - redirecionando para ${this.config.redirects.invalidLicense}`);
          return {
            canAccess: false,
            redirect: this.config.redirects.invalidLicense,
            reason: 'unknown_status'
          };
      }
    }

    console.log(`✅ Acesso permitido à ${route}`);
    return { canAccess: true };
  }
}

// Função para buscar usuários com licenças inativas
async function findUsersWithInactiveLicenses() {
  console.log('🔍 Buscando usuários com licenças inativas...');
  
  try {
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select(`
        id,
        user_id,
        status,
        expires_at,
        users!inner(id, email)
      `)
      .eq('status', 'inactive')
      .limit(3);

    if (error) {
      console.error('❌ Erro ao buscar licenças inativas:', error);
      return [];
    }

    console.log(`📊 Encontradas ${licenses?.length || 0} licenças inativas`);
    return licenses || [];
  } catch (error) {
    console.error('❌ Erro na busca:', error);
    return [];
  }
}

// Função principal de teste
async function testInactiveLicenseRedirect() {
  console.log('🚀 Iniciando teste de redirecionamento para licenças inativas\n');
  
  const middleware = new TestRouteMiddleware(routeConfig);
  const routesToTest = ['/dashboard', '/painel'];
  
  // Buscar usuários com licenças inativas
  const inactiveUsers = await findUsersWithInactiveLicenses();
  
  if (inactiveUsers.length === 0) {
    console.log('⚠️ Nenhum usuário com licença inativa encontrado para teste');
    console.log('📝 Criando cenário de teste simulado...');
    
    // Teste com usuário simulado
    const testUserId = 'test-inactive-user-id';
    console.log(`\n🧪 Testando com usuário simulado: ${testUserId}`);
    
    for (const route of routesToTest) {
      const result = await middleware.canAccessRoute(route, testUserId);
      
      if (!result.canAccess && result.redirect === '/verify-licenca') {
        console.log(`✅ SUCESSO: Usuário com licença inativa redirecionado corretamente para ${result.redirect}`);
      } else {
        console.log(`❌ FALHA: Redirecionamento incorreto para rota ${route}`);
        console.log(`   Esperado: /verify-licenca`);
        console.log(`   Recebido: ${result.redirect || 'nenhum redirecionamento'}`);
      }
    }
    return;
  }
  
  // Testar com usuários reais
  for (const user of inactiveUsers) {
    console.log(`\n👤 Testando usuário: ${user.users.email} (ID: ${user.user_id})`);
    console.log(`📄 Status da licença: ${user.status}`);
    
    for (const route of routesToTest) {
      const result = await middleware.canAccessRoute(route, user.user_id);
      
      if (!result.canAccess && result.redirect === '/verify-licenca') {
        console.log(`✅ SUCESSO: Usuário redirecionado corretamente para ${result.redirect}`);
      } else {
        console.log(`❌ FALHA: Redirecionamento incorreto para rota ${route}`);
        console.log(`   Esperado: /verify-licenca`);
        console.log(`   Recebido: ${result.redirect || 'nenhum redirecionamento'}`);
      }
    }
  }
  
  console.log('\n🏁 Teste de redirecionamento concluído!');
}

// Executar teste
testInactiveLicenseRedirect().catch(console.error);