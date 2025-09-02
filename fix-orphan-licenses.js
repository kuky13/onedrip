import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://oghjlypdnmqecaavekyr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixOrphanLicenses() {
  console.log('🔧 Corrigindo licenças órfãs...');
  
  try {
    // Primeiro, vamos ver quantas licenças órfãs existem
    const { data: orphanLicenses, error: orphanError } = await supabase
      .from('licenses')
      .select('id, code, is_active, expires_at, created_at')
      .is('user_id', null);
    
    if (orphanError) {
      console.error('❌ Erro ao buscar licenças órfãs:', orphanError);
      return;
    }
    
    console.log(`📋 Encontradas ${orphanLicenses?.length || 0} licenças órfãs (user_id = null)`);
    
    if (!orphanLicenses || orphanLicenses.length === 0) {
      console.log('✅ Nenhuma licença órfã encontrada!');
      return;
    }
    
    // Mostrar detalhes das licenças órfãs
    orphanLicenses.forEach((license, index) => {
      console.log(`\n🔍 Licença órfã ${index + 1}:`);
      console.log(`  ID: ${license.id}`);
      console.log(`  Código: ${license.code}`);
      console.log(`  Ativa: ${license.is_active}`);
      console.log(`  Expira em: ${license.expires_at}`);
      console.log(`  Criada em: ${license.created_at}`);
    });
    
    // Desativar licenças órfãs ativas
    const activeLicenses = orphanLicenses.filter(l => l.is_active);
    
    if (activeLicenses.length > 0) {
      console.log(`\n🚨 Desativando ${activeLicenses.length} licenças órfãs ativas...`);
      
      const { error: updateError } = await supabase
        .from('licenses')
        .update({ 
          is_active: false,
          last_validation: new Date().toISOString()
        })
        .is('user_id', null)
        .eq('is_active', true);
      
      if (updateError) {
        console.error('❌ Erro ao desativar licenças órfãs:', updateError);
        return;
      }
      
      console.log('✅ Licenças órfãs desativadas com sucesso!');
    } else {
      console.log('✅ Nenhuma licença órfã ativa encontrada.');
    }
    
    // Verificar se ainda existem licenças ativas órfãs
    const { data: remainingOrphans, error: remainingError } = await supabase
      .from('licenses')
      .select('id')
      .is('user_id', null)
      .eq('is_active', true);
    
    if (remainingError) {
      console.error('❌ Erro ao verificar licenças órfãs restantes:', remainingError);
      return;
    }
    
    if (remainingOrphans && remainingOrphans.length > 0) {
      console.log(`⚠️ Ainda existem ${remainingOrphans.length} licenças órfãs ativas!`);
    } else {
      console.log('✅ Todas as licenças órfãs foram desativadas!');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixOrphanLicenses();