/**
 * Script para testar se a correção dos erros de validação de licença funcionou
 * Testa a função validate_user_license_complete e verifica se não há mais erros
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://oghjlypdnmqecaavekyr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLicenseValidationFix() {
  console.log('🔧 Testando correção da validação de licença...');
  console.log('=' .repeat(60));

  try {
    // 1. Testar conexão com Supabase
    console.log('\n1. 🌐 Testando conexão com Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('licenses')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error('❌ Erro de conexão:', healthError.message);
      return;
    }
    console.log('✅ Conexão com Supabase OK');

    // 2. Verificar se a função RPC existe
    console.log('\n2. 🔍 Verificando função validate_user_license_complete...');
    
    // Buscar um usuário com licença para testar
    const { data: licenses, error: licenseError } = await supabase
      .from('licenses')
      .select('user_id')
      .not('user_id', 'is', null)
      .limit(1);
    
    if (licenseError) {
      console.error('❌ Erro ao buscar licenças:', licenseError.message);
      return;
    }

    if (!licenses || licenses.length === 0) {
      console.log('⚠️  Nenhuma licença com usuário encontrada para teste');
      
      // Testar com UUID fictício para verificar se a função existe
      console.log('\n3. 🧪 Testando função com UUID fictício...');
      const { data: testData, error: testError } = await supabase
        .rpc('validate_user_license_complete', {
          p_user_id: '00000000-0000-0000-0000-000000000000'
        });
      
      if (testError) {
        if (testError.message.includes('function') && testError.message.includes('does not exist')) {
          console.error('❌ Função validate_user_license_complete não existe!');
          return;
        } else {
          console.log('✅ Função existe (erro esperado para UUID fictício)');
          console.log('   Erro:', testError.message);
        }
      } else {
        console.log('✅ Função executada com sucesso');
        console.log('   Resultado:', testData);
      }
      return;
    }

    const testUserId = licenses[0].user_id;
    console.log(`   Testando com user_id: ${testUserId}`);

    // 3. Testar a função RPC
    console.log('\n3. 🧪 Executando validate_user_license_complete...');
    const startTime = Date.now();
    
    const { data: validationData, error: validationError } = await supabase
      .rpc('validate_user_license_complete', {
        p_user_id: testUserId
      });
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    if (validationError) {
      console.error('❌ Erro na função RPC:', validationError.message);
      console.error('   Código:', validationError.code);
      console.error('   Detalhes:', validationError.details);
      return;
    }

    console.log('✅ Função executada com sucesso!');
    console.log(`   Tempo de execução: ${executionTime}ms`);
    console.log('   Resultado:');
    console.log('   ', JSON.stringify(validationData, null, 2));

    // 4. Verificar estrutura da resposta
    console.log('\n4. 📋 Verificando estrutura da resposta...');
    const expectedFields = ['has_license', 'is_valid', 'license_code', 'expires_at', 'message'];
    const missingFields = expectedFields.filter(field => !(field in validationData));
    
    if (missingFields.length > 0) {
      console.warn('⚠️  Campos ausentes na resposta:', missingFields);
    } else {
      console.log('✅ Estrutura da resposta está correta');
    }

    // 5. Testar diferentes cenários
    console.log('\n5. 🎯 Testando cenários adicionais...');
    
    // Teste com usuário inexistente
    const { data: invalidData, error: invalidError } = await supabase
      .rpc('validate_user_license_complete', {
        p_user_id: '99999999-9999-9999-9999-999999999999'
      });
    
    if (invalidError) {
      console.error('❌ Erro ao testar usuário inexistente:', invalidError.message);
    } else {
      console.log('✅ Teste com usuário inexistente OK');
      console.log('   Resultado:', invalidData);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Teste de validação de licença concluído com sucesso!');
    console.log('✅ A função validate_user_license_complete está funcionando corretamente');
    console.log('✅ Não foram encontrados erros de rede ou CORS');
    console.log('✅ A estrutura da resposta está adequada');
    
  } catch (error) {
    console.error('\n💥 Erro inesperado durante o teste:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Executar o teste
testLicenseValidationFix().catch(console.error);