/**
 * Script para testar se a correção do parâmetro p_user_id resolveu o problema
 * Testa especificamente o RouteMiddleware com usuários reais
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://rnpkqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucGtxanFqcWpxanFqcWpxanFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI2NzQsImV4cCI6MjA1MDU0ODY3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFinalFix() {
  console.log('🧪 Testando correção final do RouteMiddleware...');
  console.log('=' .repeat(60));

  try {
    // Buscar usuários com licenças ativas
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('user_id, code, is_active, expires_at')
      .eq('is_active', true)
      .limit(3);

    if (error) {
      console.error('❌ Erro ao buscar licenças:', error);
      return;
    }

    if (!licenses || licenses.length === 0) {
      console.log('⚠️ Nenhuma licença ativa encontrada');
      return;
    }

    console.log(`📋 Encontradas ${licenses.length} licenças ativas`);

    for (const license of licenses) {
      console.log(`\n🔍 Testando usuário: ${license.user_id}`);
      console.log(`   📄 Código da licença: ${license.code}`);
      console.log(`   📅 Expira em: ${license.expires_at}`);

      // Testar a função RPC com o parâmetro correto
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('validate_user_license_complete', { p_user_id: license.user_id });

      if (rpcError) {
        console.error(`   ❌ Erro na RPC:`, rpcError);
        continue;
      }

      console.log('   📊 Resultado da RPC validate_user_license_complete:');
      console.log(`      - has_license: ${rpcResult?.has_license}`);
      console.log(`      - is_valid: ${rpcResult?.is_valid}`);
      console.log(`      - requires_activation: ${rpcResult?.requires_activation}`);
      console.log(`      - requires_renewal: ${rpcResult?.requires_renewal}`);
      console.log(`      - expires_at: ${rpcResult?.expires_at}`);
      console.log(`      - license_code: ${rpcResult?.license_code}`);

      // Determinar status como o RouteMiddleware faz
      let status;
      if (!rpcResult?.has_license) {
        status = 'not_found';
      } else if (rpcResult?.requires_renewal) {
        status = 'expired';
      } else if (!rpcResult?.is_valid || rpcResult?.requires_activation) {
        status = 'inactive';
      } else {
        status = 'active';
      }

      console.log(`   🎯 Status calculado pelo middleware: ${status}`);

      if (status === 'active') {
        console.log('   ✅ Usuário DEVERIA ter acesso às rotas /painel e /dashboard');
      } else {
        console.log(`   ❌ Usuário seria redirecionado para /licenca (status: ${status})`);
      }

      // Simular verificação de acesso às rotas específicas
      const routesToTest = ['/dashboard', '/painel'];
      
      for (const route of routesToTest) {
        console.log(`\n   🔐 Simulando acesso à rota ${route}:`);
        
        // Lógica do RouteMiddleware para rotas que requerem licença
        if (status === 'active') {
          console.log(`      ✅ ACESSO PERMITIDO a ${route}`);
        } else if (status === 'inactive') {
          console.log(`      ❌ ACESSO NEGADO a ${route} - Redirecionamento: /verify-licenca`);
        } else if (status === 'expired') {
          console.log(`      ❌ ACESSO NEGADO a ${route} - Redirecionamento: /verify-licenca`);
        } else if (status === 'not_found') {
          console.log(`      ❌ ACESSO NEGADO a ${route} - Redirecionamento: /licenca`);
        }
      }
    }

    console.log('\n🎯 RESUMO DA CORREÇÃO:');
    console.log('   - Parâmetro da RPC corrigido de "user_id" para "p_user_id"');
    console.log('   - RouteMiddleware agora deve funcionar corretamente');
    console.log('   - Usuários com licenças ativas devem acessar /painel e /dashboard');
    console.log('   - Cache do middleware será invalidado automaticamente');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }

  console.log('\n✅ Teste da correção final concluído');
}

testFinalFix();