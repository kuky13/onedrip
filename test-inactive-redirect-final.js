import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://oghjlypdnmqecaavekyr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração de rotas (baseada no routeConfig.ts)
const routeConfig = {
  protectedRoutes: {
    requiresLicense: ['/dashboard', '/painel'],
    requiresAuth: ['/profile', '/settings']
  },
  redirects: {
    invalidLicense: '/licenca',
    inactiveLicense: '/verify-licenca'
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
        console.error('❌ Erro ao verificar licença:', error.message);
        return { status: 'not_found', lastCheck: Date.now() };
      }

      console.log('📊 Dados da licença:', {
        has_license: data?.has_license,
        is_valid: data?.is_valid,
        requires_activation: data?.requires_activation,
        requires_renewal: data?.requires_renewal,
        expires_at: data?.expires_at
      });

      // Lógica do RouteMiddleware para determinar status
      let status;
      if (!data?.has_license) {
        status = 'not_found';
      } else if (data?.requires_renewal) {
        status = 'expired';
      } else if (!data?.is_valid || data?.requires_activation) {
        status = 'inactive';
      } else {
        status = 'active';
      }

      console.log(`📋 Status determinado: ${status}`);
      return { status, lastCheck: Date.now() };
    } catch (error) {
      console.error('❌ Erro na verificação:', error.message);
      return { status: 'not_found', lastCheck: Date.now() };
    }
  }

  async canAccessRoute(route, userId) {
    console.log(`\n🛡️ Verificando acesso à rota: ${route} para usuário: ${userId}`);
    
    // Verificar se a rota requer licença
    const requiresLicense = this.config.protectedRoutes.requiresLicense.includes(route);
    
    if (!requiresLicense) {
      console.log(`✅ Rota ${route} não requer licença`);
      return { canAccess: true };
    }

    const licenseCheck = await this.checkLicenseStatus(userId);
    
    if (licenseCheck.status === 'active') {
      console.log(`✅ Acesso permitido - licença ativa`);
      return { canAccess: true };
    }
    
    // Determinar redirecionamento baseado no status
    let redirectTo;
    if (licenseCheck.status === 'inactive' || licenseCheck.status === 'expired') {
      redirectTo = '/verify-licenca';
      console.log(`❌ Acesso negado - redirecionando para ${redirectTo} (status: ${licenseCheck.status})`);
    } else if (licenseCheck.status === 'not_found') {
      redirectTo = this.config.redirects.invalidLicense;
      console.log(`❌ Acesso negado - redirecionando para ${redirectTo} (sem licença)`);
    }
    
    return {
      canAccess: false,
      redirect: redirectTo,
      reason: `Licença ${licenseCheck.status}`
    };
  }
}

// Função para buscar usuários com diferentes status de licença
async function findTestUsers() {
  console.log('🔍 Buscando usuários para teste...');
  
  try {
    // Buscar algumas licenças para teste
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('user_id, is_active, expires_at')
      .limit(5);

    if (error) {
      console.error('❌ Erro ao buscar licenças:', error.message);
      return [];
    }

    console.log(`📋 Encontradas ${licenses?.length || 0} licenças`);
    
    const testUsers = [];
    
    for (const license of licenses || []) {
      // Verificar status via RPC para cada usuário
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('validate_user_license_complete', { p_user_id: license.user_id });
      
      if (!rpcError && rpcData) {
        let status = 'unknown';
        if (!rpcData.has_license) {
          status = 'not_found';
        } else if (rpcData.requires_renewal) {
          status = 'expired';
        } else if (!rpcData.is_valid || rpcData.requires_activation) {
          status = 'inactive';
        } else {
          status = 'active';
        }
        
        testUsers.push({
          user_id: license.user_id,
          status: status,
          license_active: license.is_active,
          expires_at: license.expires_at
        });
      }
    }
    
    return testUsers;
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error.message);
    return [];
  }
}

// Função principal de teste
async function testInactiveLicenseRedirect() {
  console.log('🚀 Iniciando teste de redirecionamento para licenças inativas\n');
  
  const middleware = new TestRouteMiddleware(routeConfig);
  const routesToTest = ['/dashboard', '/painel'];
  
  // Buscar usuários para teste
  const testUsers = await findTestUsers();
  
  if (testUsers.length === 0) {
    console.log('❌ Nenhum usuário encontrado para teste');
    return;
  }
  
  console.log(`\n📋 Testando com ${testUsers.length} usuários:\n`);
  
  let successCount = 0;
  let totalTests = 0;
  
  for (const user of testUsers) {
    console.log(`\n👤 Usuário: ${user.user_id}`);
    console.log(`📄 Status da licença: ${user.status}`);
    console.log(`🔒 Licença ativa no DB: ${user.license_active}`);
    
    for (const route of routesToTest) {
      totalTests++;
      const result = await middleware.canAccessRoute(route, user.user_id);
      
      // Verificar se o redirecionamento está correto
      if (user.status === 'inactive' || user.status === 'expired') {
        if (!result.canAccess && result.redirect === '/verify-licenca') {
          console.log(`✅ SUCESSO: Usuário com licença ${user.status} redirecionado corretamente para ${result.redirect}`);
          successCount++;
        } else {
          console.log(`❌ FALHA: Redirecionamento incorreto para rota ${route}`);
          console.log(`   Status: ${user.status}`);
          console.log(`   Esperado: /verify-licenca`);
          console.log(`   Recebido: ${result.redirect || 'nenhum redirecionamento'}`);
        }
      } else if (user.status === 'not_found') {
        if (!result.canAccess && result.redirect === '/licenca') {
          console.log(`✅ SUCESSO: Usuário sem licença redirecionado corretamente para ${result.redirect}`);
          successCount++;
        } else {
          console.log(`❌ FALHA: Redirecionamento incorreto para usuário sem licença`);
          console.log(`   Esperado: /licenca`);
          console.log(`   Recebido: ${result.redirect || 'nenhum redirecionamento'}`);
        }
      } else if (user.status === 'active') {
        if (result.canAccess) {
          console.log(`✅ SUCESSO: Usuário com licença ativa tem acesso permitido`);
          successCount++;
        } else {
          console.log(`❌ FALHA: Usuário com licença ativa foi bloqueado incorretamente`);
        }
      }
    }
  }
  
  console.log(`\n📊 Resultado do teste:`);
  console.log(`✅ Sucessos: ${successCount}/${totalTests}`);
  console.log(`❌ Falhas: ${totalTests - successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    console.log(`\n🎉 TODOS OS TESTES PASSARAM! O redirecionamento está funcionando corretamente.`);
  } else {
    console.log(`\n⚠️ Alguns testes falharam. Verifique a lógica de redirecionamento.`);
  }
}

// Executar teste
testInactiveLicenseRedirect().catch(console.error);