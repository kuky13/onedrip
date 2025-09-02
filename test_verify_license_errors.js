/**
 * Script para testar e diagnosticar erros na página de verificação de licença
 * Identifica problemas de conexão com Supabase e função RPC
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (mesmas credenciais do frontend)
const SUPABASE_URL = "https://oghjlypdnmqecaavekyr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testVerifyLicenseErrors() {
  console.log('🔍 Diagnosticando erros na página de verificação de licença...');
  console.log('=' .repeat(70));

  try {
    // 1. Testar conexão básica com Supabase
    console.log('\n1. 🌐 Testando conexão básica com Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('licenses')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error('❌ Erro de conexão básica:', healthError.message);
      return;
    }
    console.log('✅ Conexão básica com Supabase OK');

    // 2. Testar acesso à tabela auth.users
    console.log('\n2. 👤 Testando acesso à tabela auth.users...');
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Erro ao acessar auth.users:', usersError.message);
      console.log('   Código do erro:', usersError.code);
      console.log('   Detalhes:', usersError.details);
    } else {
      console.log('✅ Acesso à tabela auth.users OK');
      console.log('   Encontrados:', users?.length || 0, 'usuários');
    }

    // 3. Testar função RPC validate_user_license_complete
    console.log('\n3. 🔧 Testando função RPC validate_user_license_complete...');
    
    // Primeiro, buscar um usuário real para testar
    const { data: realUsers, error: realUsersError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (realUsersError) {
       console.error('❌ Erro ao buscar usuários reais:', realUsersError.message);
     } else if (realUsers && realUsers.length > 0) {
      const testUserId = realUsers[0].id;
      console.log('   Testando com usuário ID:', testUserId);
      
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('validate_user_license_complete', {
          p_user_id: testUserId
        });
      
      if (rpcError) {
        console.error('❌ Erro na função RPC:', rpcError.message);
        console.log('   Código do erro:', rpcError.code);
        console.log('   Detalhes:', rpcError.details);
        console.log('   Hint:', rpcError.hint);
      } else {
        console.log('✅ Função RPC executada com sucesso');
        console.log('   Resultado:', JSON.stringify(rpcResult, null, 2));
      }
    } else {
      console.log('⚠️ Nenhum usuário encontrado para testar a função RPC');
    }

    // 4. Testar com UUID fictício (para verificar se a função existe)
    console.log('\n4. 🧪 Testando função RPC com UUID fictício...');
    const { data: fakeResult, error: fakeError } = await supabase
      .rpc('validate_user_license_complete', {
        p_user_id: '00000000-0000-0000-0000-000000000000'
      });
    
    if (fakeError) {
      if (fakeError.message.includes('function') && fakeError.message.includes('does not exist')) {
        console.error('❌ Função validate_user_license_complete NÃO EXISTE!');
      } else {
        console.log('✅ Função existe (erro esperado para UUID fictício)');
        console.log('   Erro:', fakeError.message);
      }
    } else {
      console.log('✅ Função executada com UUID fictício');
      console.log('   Resultado:', JSON.stringify(fakeResult, null, 2));
    }

    // 5. Verificar permissões da função
    console.log('\n5. 🔐 Verificando permissões da função...');
    const { data: permissions, error: permError } = await supabase
      .from('information_schema.routine_privileges')
      .select('*')
      .eq('routine_name', 'validate_user_license_complete');
    
    if (permError) {
      console.log('⚠️ Não foi possível verificar permissões:', permError.message);
    } else {
      console.log('📋 Permissões encontradas:', permissions?.length || 0);
      if (permissions && permissions.length > 0) {
        permissions.forEach(perm => {
          console.log(`   - ${perm.grantee}: ${perm.privilege_type}`);
        });
      }
    }

    // 6. Testar políticas RLS nas tabelas relacionadas
    console.log('\n6. 🛡️ Testando políticas RLS...');
    
    // Testar acesso às licenças
    const { data: licensesTest, error: licensesError } = await supabase
      .from('licenses')
      .select('id, code, is_active')
      .limit(1);
    
    if (licensesError) {
      console.error('❌ Erro ao acessar tabela licenses:', licensesError.message);
    } else {
      console.log('✅ Acesso à tabela licenses OK');
    }

  } catch (error) {
    console.error('❌ Erro inesperado durante os testes:', error);
  }

  console.log('\n' + '=' .repeat(70));
  console.log('🏁 Diagnóstico concluído!');
}

// Executar o teste
testVerifyLicenseErrors().catch(console.error);