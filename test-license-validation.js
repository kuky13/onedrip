import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://oghjlypdnmqecaavekyr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLicenseValidation() {
  console.log('🔍 Testando validação de licença...');
  
  try {
    // Buscar usuários com licenças ativas
    const { data: users, error: usersError } = await supabase
      .from('licenses')
      .select('user_id, is_active, expires_at')
      .eq('is_active', true)
      .limit(3);
    
    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️ Nenhum usuário com licença ativa encontrado');
      return;
    }
    
    console.log(`📋 Encontrados ${users.length} usuários com licenças ativas`);
    
    // Testar a função RPC para cada usuário
    for (const user of users) {
      console.log(`\n👤 Testando usuário: ${user.user_id}`);
      console.log(`📅 Licença expira em: ${user.expires_at}`);
      
      const { data: licenseData, error: rpcError } = await supabase
        .rpc('validate_user_license_complete', { p_user_id: user.user_id });
      
      if (rpcError) {
        console.error(`❌ Erro na RPC para usuário ${user.user_id}:`, rpcError);
        continue;
      }
      
      console.log(`✅ Resultado da RPC:`, {
        is_valid: licenseData?.is_valid,
        is_active: licenseData?.is_active,
        requires_renewal: licenseData?.requires_renewal,
        days_remaining: licenseData?.days_remaining
      });
      
      // Verificar se há inconsistência
      if (user.is_active && !licenseData?.is_valid) {
        console.log('🚨 INCONSISTÊNCIA DETECTADA: Licença ativa na tabela mas inválida na RPC!');
      } else if (user.is_active && licenseData?.is_valid) {
        console.log('✅ Consistente: Licença ativa e válida');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testLicenseValidation();