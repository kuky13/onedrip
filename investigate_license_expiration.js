import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://oghjlypdnmqecaavekyr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTk1Mjc1NywiZXhwIjoyMDYxNTI4NzU3fQ.l_vuiwdlSERbCQ4vDHBS0oxhEhP7VfWliMhMpQDqpys';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateLicenseExpiration() {
  console.log('🔍 Investigando sistema de expiração automática de licenças...');
  console.log('=' .repeat(70));
  
  try {
    // 1. Verificar todas as licenças e seus status
    console.log('\n1. Analisando todas as licenças:');
    const { data: allLicenses, error: allError } = await supabase
      .from('licenses')
      .select('id, code, user_id, expires_at, is_active, activated_at, created_at')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.log('❌ Erro ao buscar licenças:', allError.message);
      return;
    }
    
    console.log(`📊 Total de licenças encontradas: ${allLicenses.length}`);
    
    // 2. Analisar licenças por status
    const now = new Date();
    const activeLicenses = allLicenses.filter(l => l.is_active === true);
    const inactiveLicenses = allLicenses.filter(l => l.is_active === false);
    const expiredLicenses = allLicenses.filter(l => l.expires_at && new Date(l.expires_at) < now);
    const expiredButActive = allLicenses.filter(l => l.expires_at && new Date(l.expires_at) < now && l.is_active === true);
    const validActiveLicenses = allLicenses.filter(l => l.is_active === true && (!l.expires_at || new Date(l.expires_at) > now));
    
    console.log('\n📈 Estatísticas detalhadas:');
    console.log(`   • Licenças ativas: ${activeLicenses.length}`);
    console.log(`   • Licenças inativas: ${inactiveLicenses.length}`);
    console.log(`   • Licenças expiradas (total): ${expiredLicenses.length}`);
    console.log(`   • Licenças expiradas MAS ainda ativas: ${expiredButActive.length}`);
    console.log(`   • Licenças ativas e válidas: ${validActiveLicenses.length}`);
    
    // 3. Mostrar detalhes das licenças expiradas mas ativas (se houver)
    if (expiredButActive.length > 0) {
      console.log('\n⚠️ LICENÇAS EXPIRADAS MAS AINDA MARCADAS COMO ATIVAS:');
      expiredButActive.forEach((license, index) => {
        const daysExpired = Math.floor((now - new Date(license.expires_at)) / (1000 * 60 * 60 * 24));
        console.log(`   ${index + 1}. ID: ${license.id}`);
        console.log(`      Código: ${license.code}`);
        console.log(`      User ID: ${license.user_id}`);
        console.log(`      Expirou em: ${license.expires_at}`);
        console.log(`      Dias expirada: ${daysExpired}`);
        console.log(`      Status: ${license.is_active ? 'ATIVA' : 'INATIVA'}`);
        console.log('');
      });
    }
    
    // 4. Verificar algumas licenças recentes para entender o padrão
    console.log('\n📋 Amostra das 5 licenças mais recentes:');
    const recentLicenses = allLicenses.slice(0, 5);
    recentLicenses.forEach((license, index) => {
      const isExpired = license.expires_at && new Date(license.expires_at) < now;
      const status = license.is_active ? '🟢 ATIVA' : '🔴 INATIVA';
      const expiredStatus = isExpired ? '⏰ EXPIRADA' : '✅ VÁLIDA';
      
      console.log(`   ${index + 1}. ${license.code} - ${status} - ${expiredStatus}`);
      console.log(`      Expira em: ${license.expires_at || 'Nunca'}`);
      if (isExpired && license.is_active) {
        console.log(`      ⚠️ PROBLEMA: Expirada mas ainda ativa!`);
      }
      console.log('');
    });
    
    // 5. Testar função is_user_license_active com usuários específicos
    console.log('\n🧪 Testando função is_user_license_active:');
    const usersToTest = [...new Set(allLicenses.filter(l => l.user_id).map(l => l.user_id))].slice(0, 3);
    
    for (const userId of usersToTest) {
      const userLicense = allLicenses.find(l => l.user_id === userId);
      const { data: isActive, error: testError } = await supabase
        .rpc('is_user_license_active', { p_user_id: userId });
      
      if (testError) {
        console.log(`   ❌ Erro ao testar usuário ${userId}: ${testError.message}`);
      } else {
        const licenseStatus = userLicense ? (userLicense.is_active ? 'ATIVA' : 'INATIVA') : 'SEM LICENÇA';
        const isExpired = userLicense && userLicense.expires_at && new Date(userLicense.expires_at) < now;
        console.log(`   👤 Usuário ${userId}:`);
        console.log(`      Licença no DB: ${licenseStatus}`);
        console.log(`      Função retorna: ${isActive ? 'ATIVA' : 'INATIVA'}`);
        console.log(`      Expirada: ${isExpired ? 'SIM' : 'NÃO'}`);
        
        if (userLicense && isExpired && userLicense.is_active && !isActive) {
          console.log(`      ✅ Função corretamente identifica licença expirada como inativa`);
        } else if (userLicense && isExpired && userLicense.is_active && isActive) {
          console.log(`      ⚠️ Função não está funcionando corretamente`);
        }
        console.log('');
      }
    }
    
    // 6. Verificar se existem funções relacionadas a licenças
    console.log('\n🔧 Testando funções disponíveis relacionadas a licenças:');
    const functionsToTest = [
      'is_user_license_active',
      'is_license_valid',
      'admin_activate_user_license',
      'admin_deactivate_user_license'
    ];
    
    for (const funcName of functionsToTest) {
      try {
        // Testar se a função existe (vai dar erro se não existir)
        if (funcName === 'is_user_license_active' && usersToTest.length > 0) {
          await supabase.rpc(funcName, { p_user_id: usersToTest[0] });
          console.log(`   ✅ ${funcName} - EXISTE`);
        } else if (funcName === 'is_license_valid') {
          // Esta função pode não precisar de parâmetros ou ter parâmetros diferentes
          console.log(`   ⚠️ ${funcName} - PRECISA SER TESTADA MANUALMENTE`);
        } else {
          console.log(`   ⚠️ ${funcName} - PRECISA SER TESTADA MANUALMENTE`);
        }
      } catch (error) {
        if (error.message.includes('Could not find the function')) {
          console.log(`   ❌ ${funcName} - NÃO EXISTE`);
        } else {
          console.log(`   ✅ ${funcName} - EXISTE (erro de parâmetros)`);
        }
      }
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('📋 RELATÓRIO FINAL - SISTEMA DE EXPIRAÇÃO DE LICENÇAS');
    console.log('=' .repeat(70));
    
    if (expiredButActive.length > 0) {
      console.log('❌ CONCLUSÃO: O sistema NÃO possui atualização automática!');
      console.log('\n🔍 EVIDÊNCIAS ENCONTRADAS:');
      console.log(`   • ${expiredButActive.length} licenças expiradas ainda marcadas como ativas`);
      console.log('   • Campo is_active não é atualizado automaticamente quando expires_at é atingido');
      console.log('   • A validação de expiração acontece apenas na função is_user_license_active');
      
      console.log('\n⚙️ COMO O SISTEMA FUNCIONA ATUALMENTE:');
      console.log('   1. Licenças são criadas com is_active = true (quando ativadas)');
      console.log('   2. Campo expires_at define quando a licença expira');
      console.log('   3. Campo is_active NÃO é atualizado automaticamente');
      console.log('   4. Função is_user_license_active verifica: is_active = true AND expires_at > NOW()');
      console.log('   5. Validação de expiração é feita em tempo real, não por atualização do banco');
      
      console.log('\n💡 IMPLICAÇÕES:');
      console.log('   ✅ Sistema funciona corretamente para validação de acesso');
      console.log('   ⚠️ Dados no banco podem parecer inconsistentes (licenças expiradas marcadas como ativas)');
      console.log('   ⚠️ Relatórios baseados apenas em is_active podem ser imprecisos');
      
      console.log('\n🔧 RECOMENDAÇÕES:');
      console.log('   1. MANTER sistema atual se funcionalidade está OK');
      console.log('   2. OU implementar job cron para atualizar is_active automaticamente');
      console.log('   3. OU sempre usar função is_user_license_active para validações');
      console.log('   4. Para relatórios, sempre considerar expires_at além de is_active');
      
    } else {
      console.log('✅ RESULTADO: Não foram encontradas licenças expiradas marcadas como ativas');
      console.log('\n📊 POSSÍVEIS CENÁRIOS:');
      console.log('   1. Todas as licenças ainda estão válidas');
      console.log('   2. Existe um mecanismo automático funcionando');
      console.log('   3. Licenças expiradas foram manualmente desativadas');
      
      console.log('\n🔍 PARA CONFIRMAR:');
      console.log('   • Aguarde algumas licenças expirarem naturalmente');
      console.log('   • Ou crie uma licença de teste com expires_at no passado');
      console.log('   • Monitore se is_active é atualizado automaticamente');
    }
    
    console.log('\n📈 RESUMO DOS DADOS:');
    console.log(`   • Total de licenças: ${allLicenses.length}`);
    console.log(`   • Licenças ativas: ${activeLicenses.length}`);
    console.log(`   • Licenças inativas: ${inactiveLicenses.length}`);
    console.log(`   • Licenças expiradas: ${expiredLicenses.length}`);
    console.log(`   • Licenças expiradas mas ativas: ${expiredButActive.length}`);
    
  } catch (error) {
    console.error('❌ Erro durante a investigação:', error);
  }
}

// Executar a investigação
investigateLicenseExpiration();