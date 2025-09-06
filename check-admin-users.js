import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oghjlypdnmqecaavekyr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminUsers() {
  try {
    console.log('🔍 Verificando usuários admin...');
    
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, name, role')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      return;
    }
    
    console.log('📋 Todos os usuários:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.role}) - ID: ${user.id}`);
    });
    
    const adminUsers = users.filter(user => user.role === 'admin');
    console.log('\n👑 Usuários admin:');
    if (adminUsers.length === 0) {
      console.log('❌ Nenhum usuário admin encontrado!');
    } else {
      adminUsers.forEach(user => {
        console.log(`- ${user.name} - ID: ${user.id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkAdminUsers();