/**
 * Script para testar a função RPC validate_user_license_complete
 * Verifica se usuários com licenças ativas são identificados corretamente
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (usando variáveis de ambiente se disponíveis)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rnpkqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLicenseValidation() {
  console.log('🧪 Testando validação de licença após correção do RouteMiddleware...');
  
  try {
    // Buscar usuários com licenças ativas
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select(`
        user_id,
        is_active,
        expires_at,
        user_profiles!inner(email)
      `)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .limit(5);
    
    if (error) {
      console.error('❌ Erro ao buscar licenças:', error);
      return;
    }
    
    if (!licenses || licenses.length === 0) {
      console.log('⚠️ Nenhuma licença ativa encontrada para teste');
      return;
    }
    
    console.log(`✅ Encontradas ${licenses.length} licenças ativas para teste`);
    
    // Testar cada usuário
    for (const license of licenses) {
      const userId = license.user_id;
      const userEmail = license.user_profiles?.email || 'email_não_encontrado';
      
      console.log(`\n👤 Testando usuário: ${userEmail} (${userId})`);
      console.log(`   📅 Licença expira em: ${license.expires_at}`);
      console.log(`   ✅ Status na tabela: ${license.is_active ? 'ATIVA' : 'INATIVA'}`);
      
      // Testar a função RPC validate_user_license_complete
      console.log('  🔍 Testando função RPC validate_user_license_complete...');
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('validate_user_license_complete', { user_id: userId });
      
      if (rpcError) {
        console.log(`  ❌ Erro na RPC: ${rpcError.message}`);
        continue;
      }
      
      console.log(`  📋 Resultado da RPC:`);
      console.log(`    has_license: ${rpcData.has_license}`);
      console.log(`    is_valid: ${rpcData.is_valid}`);
      console.log(`    requires_activation: ${rpcData.requires_activation}`);
      console.log(`    requires_renewal: ${rpcData.requires_renewal}`);
      console.log(`    expires_at: ${rpcData.expires_at}`);
      
      // Determinar o que o RouteMiddleware faria com esses dados
      let routeMiddlewareStatus;
      if (!rpcData.has_license) {
        routeMiddlewareStatus = 'not_found';
      } else if (rpcData.requires_renewal) {
        routeMiddlewareStatus = 'expired';
      } else if (!rpcData.is_valid || rpcData.requires_activation) {
        routeMiddlewareStatus = 'inactive';
      } else {
        routeMiddlewareStatus = 'active';
      }
      
      console.log(`  🎯 Status que RouteMiddleware determinaria: ${routeMiddlewareStatus}`);
      
      // Verificar se o usuário deveria ter acesso
      const shouldHaveAccess = routeMiddlewareStatus === 'active';
      console.log(`  🚪 Acesso a /dashboard e /painel: ${shouldHaveAccess ? '✅ PERMITIDO' : '❌ NEGADO'}`);
      
      if (!shouldHaveAccess) {
        console.log(`  ⚠️ PROBLEMA: Usuário com licença ativa na tabela seria NEGADO!`);
        console.log(`     Motivo: Status determinado como '${routeMiddlewareStatus}'`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
testLicenseValidation().then(() => {
  console.log('\n🏁 Teste concluído');
}).catch(error => {
  console.error('❌ Erro fatal no teste:', error);
});