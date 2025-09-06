import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://oghjlypdnmqecaavekyr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAdminAccess() {
  try {
    console.log('🔍 Testando acesso admin...');
    
    // 1. Verificar usuários admin
    console.log('\n1. Verificando usuários admin:');
    const { data: adminUsers, error: adminError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('role', 'admin');
    
    if (adminError) {
      console.error('❌ Erro ao buscar usuários admin:', adminError);
    } else {
      console.log('✅ Usuários admin encontrados:', adminUsers);
    }
    
    // 1.1. Verificar todos os usuários para debug
    console.log('\n1.1. Verificando todos os usuários:');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .limit(10);
    
    if (allUsersError) {
      console.error('❌ Erro ao buscar todos os usuários:', allUsersError);
    } else {
      console.log('✅ Todos os usuários encontrados:', allUsers);
    }
    
    // 2. Verificar configuração de rotas no middleware
    console.log('\n2. Testando verificação de role para /admin:');
    
    // Simular verificação de role
    const testUserRole = 'admin';
    const allowedRoles = ['admin', 'super_admin'];
    const canAccess = allowedRoles.includes(testUserRole);
    
    console.log(`Role do usuário: ${testUserRole}`);
    console.log(`Roles permitidas: ${allowedRoles.join(', ')}`);
    console.log(`Pode acessar: ${canAccess}`);
    
    // 3. Verificar se há algum usuário logado atualmente
    console.log('\n3. Verificando sessão atual:');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erro ao obter sessão:', sessionError);
    } else if (session) {
      console.log('✅ Usuário logado:', session.user.email);
      
      // Verificar role do usuário logado
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Erro ao obter perfil do usuário:', profileError);
      } else {
        console.log('✅ Role do usuário logado:', userProfile.role);
        
        // Verificar se pode acessar admin
        const userCanAccessAdmin = ['admin', 'super_admin'].includes(userProfile.role);
        console.log(`Pode acessar /admin: ${userCanAccessAdmin}`);
      }
    } else {
      console.log('ℹ️ Nenhum usuário logado');
    }
    
    // 4. Testar função RPC de verificação de licença
    console.log('\n4. Testando função RPC de licença:');
    if (session?.user?.id) {
      const { data: licenseData, error: licenseError } = await supabase
        .rpc('get_user_license_status', { p_user_id: session.user.id });
      
      if (licenseError) {
        console.error('❌ Erro na função RPC:', licenseError);
      } else {
        console.log('✅ Status da licença:', licenseData);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testAdminAccess();