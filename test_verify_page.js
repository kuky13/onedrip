// Script para testar a página de verificação de licença
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://oghjlypdnmqecaavekyr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVerifyPage() {
  console.log('🧪 Testando página de verificação de licença...');
  
  try {
    // 1. Teste de conexão básica
    console.log('\n1. Testando conexão básica...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('licenses')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Erro de conexão:', connectionError);
      return;
    }
    console.log('✅ Conexão com Supabase OK');
    
    // 2. Teste da função RPC validate_user_license_complete
    console.log('\n2. Testando função RPC validate_user_license_complete...');
    const testUserId = '12345678-1234-1234-1234-123456789012'; // UUID fictício
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('validate_user_license_complete', {
        p_user_id: testUserId
      });
    
    if (rpcError) {
      console.error('❌ Erro na função RPC:', {
        message: rpcError.message,
        code: rpcError.code,
        details: rpcError.details,
        hint: rpcError.hint
      });
    } else {
      console.log('✅ Função RPC executada com sucesso:', rpcData);
    }
    
    // 3. Verificar se há licenças na tabela
    console.log('\n3. Verificando licenças existentes...');
    const { data: licenses, error: licensesError } = await supabase
      .from('licenses')
      .select('id, code, is_active, user_id')
      .limit(5);
    
    if (licensesError) {
      console.error('❌ Erro ao buscar licenças:', licensesError);
    } else {
      console.log('✅ Licenças encontradas:', licenses?.length || 0);
      if (licenses && licenses.length > 0) {
        console.log('📋 Primeiras licenças:', licenses);
      }
    }
    
    console.log('\n🎯 Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Executar teste
testVerifyPage();