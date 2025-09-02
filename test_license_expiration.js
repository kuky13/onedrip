import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://oghjlypdnmqecaavekyr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTk1Mjc1NywiZXhwIjoyMDYxNTI4NzU3fQ.l_vuiwdlSERbCQ4vDHBS0oxhEhP7VfWliMhMpQDqpys';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLicenseExpiration() {
  console.log('🧪 Testando sistema de expiração automática de licenças...');
  console.log('=' .repeat(70));
  
  try {
    // 1. Primeiro, vamos verificar a licença expirada existente
    console.log('\n1. Verificando licença expirada existente:');
    const { data: expiredLicenses, error: expiredError } = await supabase
      .from('licenses')
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false });
    
    if (expiredError) {
      console.log('❌ Erro ao buscar licenças expiradas:', expiredError.message);
    } else if (expiredLicenses && expiredLicenses.length > 0) {
      console.log(`📋 Encontradas ${expiredLicenses.length} licenças expiradas:`);
      expiredLicenses.forEach((license, index) => {
        const daysExpired = Math.floor((new Date() - new Date(license.expires_at)) / (1000 * 60 * 60 * 24));
        console.log(`   ${index + 1}. Código: ${license.code}`);
        console.log(`      ID: ${license.id}`);
        console.log(`      Status is_active: ${license.is_active}`);
        console.log(`      Expirou em: ${license.expires_at}`);
        console.log(`      Dias expirada: ${daysExpired}`);
        console.log(`      User ID: ${license.user_id || 'Não atribuída'}`);
        console.log('');
      });
    } else {
      console.log('✅ Nenhuma licença expirada encontrada');
    }
    
    // 2. Criar uma licença de teste com data de expiração no passado
    console.log('\n2. Criando licença de teste com data expirada:');
    const testCode = `TEST_EXPIRED_${Date.now()}`;
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 7); // 7 dias atrás
    
    const { data: newLicense, error: createError } = await supabase
      .from('licenses')
      .insert({
        code: testCode,
        expires_at: expiredDate.toISOString(),
        is_active: true, // Criamos como ativa para testar se será automaticamente desativada
        activated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Erro ao criar licença de teste:', createError.message);
      return;
    }
    
    console.log(`✅ Licença de teste criada:`);
    console.log(`   Código: ${newLicense.code}`);
    console.log(`   ID: ${newLicense.id}`);
    console.log(`   Status inicial: ${newLicense.is_active ? 'ATIVA' : 'INATIVA'}`);
    console.log(`   Data de expiração: ${newLicense.expires_at}`);
    
    // 3. Aguardar um pouco e verificar se o status mudou
    console.log('\n3. Aguardando 5 segundos para verificar se há atualização automática...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const { data: updatedLicense, error: checkError } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', newLicense.id)
      .single();
    
    if (checkError) {
      console.log('❌ Erro ao verificar licença atualizada:', checkError.message);
    } else {
      console.log(`📋 Status da licença após 5 segundos:`);
      console.log(`   Status is_active: ${updatedLicense.is_active ? 'ATIVA' : 'INATIVA'}`);
      
      if (updatedLicense.is_active === newLicense.is_active) {
        console.log('   ⚠️ Status não mudou - pode não haver atualização automática imediata');
      } else {
        console.log('   ✅ Status mudou - há atualização automática!');
      }
    }
    
    // 4. Testar a função is_user_license_active com a licença de teste
    console.log('\n4. Testando função is_user_license_active com licença expirada:');
    
    // Primeiro, vamos atribuir a licença a um usuário de teste
    const testUserId = '00000000-0000-0000-0000-000000000001'; // UUID de teste
    
    const { error: updateError } = await supabase
      .from('licenses')
      .update({ user_id: testUserId })
      .eq('id', newLicense.id);
    
    if (updateError) {
      console.log('❌ Erro ao atribuir usuário à licença:', updateError.message);
    } else {
      console.log(`✅ Licença atribuída ao usuário de teste: ${testUserId}`);
      
      // Testar a função
      const { data: isActive, error: funcError } = await supabase
        .rpc('is_user_license_active', { p_user_id: testUserId });
      
      if (funcError) {
        console.log('❌ Erro ao testar função:', funcError.message);
      } else {
        console.log(`📋 Resultado da função is_user_license_active: ${isActive ? 'ATIVA' : 'INATIVA'}`);
        console.log(`📋 Status no banco (is_active): ${updatedLicense.is_active ? 'ATIVA' : 'INATIVA'}`);
        
        if (!isActive && updatedLicense.is_active) {
          console.log('✅ CONFIRMADO: Função corretamente identifica licença expirada como inativa');
          console.log('   mesmo que is_active seja true no banco de dados');
        } else if (!isActive && !updatedLicense.is_active) {
          console.log('✅ CONFIRMADO: Licença expirada está corretamente marcada como inativa');
        } else if (isActive) {
          console.log('⚠️ PROBLEMA: Função retorna ativa para licença expirada');
        }
      }
    }
    
    // 5. Aguardar mais tempo para verificar se há algum job cron que roda periodicamente
    console.log('\n5. Aguardando mais 30 segundos para verificar jobs cron periódicos...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', newLicense.id)
      .single();
    
    if (finalError) {
      console.log('❌ Erro na verificação final:', finalError.message);
    } else {
      console.log(`📋 Status final da licença após 35 segundos total:`);
      console.log(`   Status is_active: ${finalCheck.is_active ? 'ATIVA' : 'INATIVA'}`);
      
      if (finalCheck.is_active !== newLicense.is_active) {
        console.log('✅ CONFIRMADO: Há atualização automática do status!');
        console.log('   O sistema automaticamente marca licenças expiradas como inativas');
      } else if (finalCheck.is_active === true) {
        console.log('❌ CONFIRMADO: NÃO há atualização automática do status!');
        console.log('   Licenças expiradas permanecem marcadas como ativas no banco');
        console.log('   A validação de expiração é feita apenas na função is_user_license_active');
      }
    }
    
    // 6. Limpar - remover a licença de teste
    console.log('\n6. Limpando licença de teste...');
    const { error: deleteError } = await supabase
      .from('licenses')
      .delete()
      .eq('id', newLicense.id);
    
    if (deleteError) {
      console.log('❌ Erro ao remover licença de teste:', deleteError.message);
      console.log(`⚠️ Licença de teste ${testCode} (ID: ${newLicense.id}) precisa ser removida manualmente`);
    } else {
      console.log('✅ Licença de teste removida com sucesso');
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('📋 CONCLUSÃO DO TESTE');
    console.log('=' .repeat(70));
    
    if (finalCheck && finalCheck.is_active === false && newLicense.is_active === true) {
      console.log('✅ RESULTADO: Sistema possui atualização automática!');
      console.log('\n📝 DETALHES:');
      console.log('   • Licença criada como ativa com data expirada');
      console.log('   • Sistema automaticamente atualizou is_active para false');
      console.log('   • Há um mecanismo (trigger/job) que monitora licenças expiradas');
    } else {
      console.log('❌ RESULTADO: Sistema NÃO possui atualização automática!');
      console.log('\n📝 DETALHES:');
      console.log('   • Licença expirada permanece com is_active = true');
      console.log('   • Validação de expiração é feita apenas na consulta');
      console.log('   • Função is_user_license_active faz a validação em tempo real');
      console.log('   • Campo is_active no banco pode estar inconsistente');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
testLicenseExpiration();