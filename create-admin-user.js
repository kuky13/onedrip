/**
 * Script para criar um usuário admin para teste
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Configurações do Supabase
const supabaseUrl = 'https://oghjlypdnmqecaavekyr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminUser() {
  console.log('🔍 Verificando e criando usuário admin para teste...');
  
  try {
    // Primeiro, vamos verificar se já existe algum usuário
    const { data: existingUsers, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, name, role')
      .limit(10);
    
    if (fetchError) {
      console.error('❌ Erro ao buscar usuários existentes:', fetchError);
      return;
    }
    
    console.log('📋 Usuários existentes:', existingUsers);
    
    // Se já existe um usuário admin, mostrar e sair
    const adminExists = existingUsers?.find(user => user.role === 'admin');
    if (adminExists) {
      console.log('✅ Já existe um usuário admin:', adminExists);
      return;
    }
    
    // Se existe algum usuário, promover o primeiro para admin
    if (existingUsers && existingUsers.length > 0) {
      const userToPromote = existingUsers[0];
      console.log('🔄 Promovendo usuário para admin:', userToPromote.id);
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('id', userToPromote.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Erro ao promover usuário para admin:', updateError);
        return;
      }
      
      console.log('✅ Usuário promovido para admin:', updatedUser);
    } else {
      console.log('⚠️ Nenhum usuário encontrado para promover a admin');
      console.log('💡 Sugestão: Faça login na aplicação primeiro para criar um usuário');
      return;
    }
    
    // Verificar se foi criado corretamente
    const { data: verifyAdmin, error: verifyError } = await supabase
      .from('user_profiles')
      .select('id, name, role')
      .eq('role', 'admin');
    
    if (verifyError) {
      console.error('❌ Erro ao verificar usuário admin:', verifyError);
      return;
    }
    
    console.log('🔍 Usuários admin encontrados:', verifyAdmin);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
createAdminUser();