/**
 * Script para debugar o comportamento do RouteMiddleware
 * Verifica por que usuários com licenças ativas estão vendo a tela de licença
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://oghjlypdnmqecaavekyr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRouteMiddleware() {
  console.log('🔍 Iniciando debug do RouteMiddleware...');
  
  try {
    // 1. Buscar usuários com licenças ativas
    console.log('\n📋 Buscando usuários com licenças ativas...');
    const { data: activeLicenses, error: licensesError } = await supabase
      .from('licenses')
      .select('id, user_id, code, is_active, expires_at, created_at, activated_at')
      .eq('is_active', true)
      .not('user_id', 'is', null)
      .limit(5);
    
    if (licensesError) {
      console.error('❌ Erro ao buscar licenças ativas:', licensesError);
      return;
    }
    
    if (!activeLicenses || activeLicenses.length === 0) {
      console.log('⚠️ Nenhuma licença ativa encontrada');
      return;
    }
    
    console.log(`✅ Encontradas ${activeLicenses.length} licenças ativas`);
    
    // 2. Para cada usuário, testar a função RPC validate_user_license_complete
    for (const license of activeLicenses) {
      console.log(`\n🔍 Testando usuário: ${license.user_id}`);
      console.log(`   - License ID: ${license.id}`);
      console.log(`   - License Code: ${license.code}`);
      console.log(`   - User ID: ${license.user_id}`);
      console.log(`   - Is Active: ${license.is_active}`);
      console.log(`   - Expires At: ${license.expires_at}`);
      
      // Testar a função RPC validate_user_license_complete
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('validate_user_license_complete', { p_user_id: license.user_id });
      
      if (rpcError) {
        console.error(`   ❌ Erro na RPC para usuário ${license.user_id}:`, rpcError);
        continue;
      }
      
      console.log('   📊 Resultado da RPC validate_user_license_complete:');
      console.log(`      - has_license: ${rpcResult?.has_license}`);
      console.log(`      - is_valid: ${rpcResult?.is_valid}`);
      console.log(`      - requires_activation: ${rpcResult?.requires_activation}`);
      console.log(`      - requires_renewal: ${rpcResult?.requires_renewal}`);
      console.log(`      - expires_at: ${rpcResult?.expires_at}`);
      console.log(`      - license_code: ${rpcResult?.license_code}`);
      
      // Simular a lógica do RouteMiddleware
      let middlewareStatus;
      if (!rpcResult?.has_license) {
        middlewareStatus = 'not_found';
      } else if (rpcResult.requires_renewal) {
        middlewareStatus = 'expired';
      } else if (!rpcResult.is_valid || rpcResult.requires_activation) {
        middlewareStatus = 'inactive';
      } else {
        middlewareStatus = 'active';
      }
      
      console.log(`   🎯 Status calculado pelo middleware: ${middlewareStatus}`);
      
      // Verificar se haveria redirecionamento
      if (middlewareStatus !== 'active') {
        console.log(`   🚨 PROBLEMA: Usuário seria redirecionado para tela de licença!`);
        console.log(`      - Motivo: Status '${middlewareStatus}' não é 'active'`);
        
        if (middlewareStatus === 'inactive') {
          console.log(`      - Redirecionamento: /verify-licenca`);
        } else if (middlewareStatus === 'expired') {
          console.log(`      - Redirecionamento: /verify-licenca`);
        } else if (middlewareStatus === 'not_found') {
          console.log(`      - Redirecionamento: /licenca`);
        }
      } else {
        console.log(`   ✅ Usuário teria acesso permitido às rotas protegidas`);
      }
    }
    
    // 3. Verificar se há licenças órfãs restantes
    console.log('\n🔍 Verificando licenças órfãs restantes...');
    const { data: orphanLicenses, error: orphanError } = await supabase
      .from('licenses')
      .select('id, code, is_active, user_id')
      .is('user_id', null);
    
    if (orphanError) {
      console.error('❌ Erro ao verificar licenças órfãs:', orphanError);
    } else {
      console.log(`📊 Licenças órfãs encontradas: ${orphanLicenses?.length || 0}`);
      if (orphanLicenses && orphanLicenses.length > 0) {
        orphanLicenses.forEach(license => {
          console.log(`   - ID: ${license.id}, Code: ${license.code}, Active: ${license.is_active}`);
        });
      }
    }
    
    // 4. Testar as funções de configuração de rota
    console.log('\n🔍 Testando configurações de rota...');
    const testPaths = ['/dashboard', '/painel'];
    
    // Simular as funções do routeConfig
    const isPublicRoute = (path) => {
      const publicRoutes = [
        '/', '/auth', '/signup', '/sign', '/reset-password', '/verify',
        '/verify-licenca', '/plans', '/purchase-success', '/privacy',
        '/terms', '/cookies', '/cookie', '/unauthorized'
      ];
      return publicRoutes.includes(path);
    };
    
    const requiresLicense = (path) => {
      if (isPublicRoute(path)) return false;
      const licenseRequiredRoutes = ['/dashboard', '/painel', '/service-orders', '/central-de-ajuda', '/msg'];
      return licenseRequiredRoutes.some(route => {
        if (route.endsWith('/*')) {
          const basePath = route.slice(0, -2);
          return path.startsWith(basePath);
        }
        return path === route;
      });
    };
    
    testPaths.forEach(path => {
      console.log(`   - Rota: ${path}`);
      console.log(`     - É pública: ${isPublicRoute(path)}`);
      console.log(`     - Requer licença: ${requiresLicense(path)}`);
    });
    
  } catch (error) {
    console.error('❌ Erro durante o debug:', error);
  }
}

// Executar o debug
debugRouteMiddleware().then(() => {
  console.log('\n✅ Debug do RouteMiddleware concluído');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal durante o debug:', error);
  process.exit(1);
});