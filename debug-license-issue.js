import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://oghjlypdnmqecaavekyr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLicenseIssue() {
  console.log('🔍 Investigando problema de licença ativa mostrando tela de ativação...');
  console.log('=' .repeat(70));

  try {
    // 1. Buscar usuários com licenças ativas
    console.log('\n📊 Buscando usuários com licenças ativas...');
    const { data: activeLicenses, error: licensesError } = await supabase
      .from('licenses')
      .select('*')
      .eq('is_active', true)
      .not('user_id', 'is', null)
      .limit(5);

    if (licensesError) {
      console.error('❌ Erro ao buscar licenças:', licensesError);
      return;
    }

    console.log(`✅ Encontradas ${activeLicenses?.length || 0} licenças ativas`);
    
    if (!activeLicenses || activeLicenses.length === 0) {
      console.log('⚠️  Nenhuma licença ativa encontrada!');
      return;
    }

    // 2. Testar a função RPC para cada usuário com licença ativa
    for (const license of activeLicenses) {
      console.log(`\n🧪 Testando usuário: ${license.user_id}`);
      console.log(`   Licença: ${license.code}`);
      console.log(`   Ativa: ${license.is_active}`);
      console.log(`   Expira em: ${license.expires_at}`);
      console.log(`   Ativada em: ${license.activated_at}`);
      
      // Chamar a função RPC
      const { data: validation, error: validationError } = await supabase
        .rpc('validate_user_license_complete', { p_user_id: license.user_id });

      if (validationError) {
        console.error(`   ❌ Erro na validação RPC:`, validationError);
        continue;
      }

      console.log('   📋 Resultado da validação RPC:');
      console.log(`   - has_license: ${validation?.has_license}`);
      console.log(`   - is_valid: ${validation?.is_valid}`);
      console.log(`   - requires_activation: ${validation?.requires_activation}`);
      console.log(`   - requires_renewal: ${validation?.requires_renewal}`);
      console.log(`   - message: ${validation?.message}`);
      console.log(`   - days_remaining: ${validation?.days_remaining}`);
      
      // Análise do problema
      if (validation?.has_license && validation?.is_valid) {
        console.log('   ✅ USUÁRIO DEVERIA VER LICENÇA ATIVA (SEM TELA DE ATIVAÇÃO)');
      } else if (validation?.requires_activation) {
        console.log('   🚨 PROBLEMA ENCONTRADO: requires_activation = true para licença ativa!');
      } else if (!validation?.is_valid) {
        console.log('   ⚠️  PROBLEMA: is_valid = false para licença ativa');
      }
      
      console.log('   ' + '-'.repeat(50));
    }

    // 3. Verificar se há problemas na tabela de licenças
    console.log('\n🔍 Verificando inconsistências na tabela de licenças...');
    const { data: inconsistentLicenses, error: inconsistentError } = await supabase
      .from('licenses')
      .select('*')
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString());

    if (inconsistentError) {
      console.error('❌ Erro ao verificar inconsistências:', inconsistentError);
    } else {
      console.log(`⚠️  Encontradas ${inconsistentLicenses?.length || 0} licenças ativas mas expiradas`);
      if (inconsistentLicenses && inconsistentLicenses.length > 0) {
        inconsistentLicenses.forEach(license => {
          console.log(`   - Licença ${license.code} (usuário: ${license.user_id}) expirou em ${license.expires_at}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugLicenseIssue();