import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Configuração do Supabase com service role key
const supabaseUrl = 'https://oghjlypdnmqecaavekyr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTk1Mjc1NywiZXhwIjoyMDYxNTI4NzU3fQ.l_vuiwdlSERbCQ4vDHBS0oxhEhP7VfWliMhMpQDqpys';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  console.log('🔧 Configurando usuário admin...');
  
  try {
    // 1. Buscar usuário existente
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      return;
    }
    
    const adminUser = users.users.find(user => user.email === 'admin@onedrip.com');
    
    if (!adminUser) {
      console.log('❌ Usuário admin@onedrip.com não encontrado');
      return;
    }
    
    console.log('✅ Usuário encontrado:', adminUser.id);
    
    // 2. Criar ou atualizar perfil na user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: adminUser.id,
        name: 'Admin User',
        role: 'admin'
      })
      .select()
      .single();
    
    if (profileError) {
      console.error('❌ Erro ao criar/atualizar perfil:', profileError);
      return;
    }
    
    console.log('✅ Perfil admin configurado:', profile);
    console.log('🎉 Usuário admin configurado com sucesso!');
    console.log('📧 Email: admin@onedrip.com');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

createAdminUser();