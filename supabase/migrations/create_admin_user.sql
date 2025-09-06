-- Criar usuário admin para teste
-- Esta migração cria um usuário admin que pode ser usado para testar o acesso às páginas administrativas

INSERT INTO user_profiles (
  id,
  name,
  role,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Admin Teste',
  'admin',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Verificar se o usuário foi criado
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM user_profiles WHERE role = 'admin') THEN
    RAISE NOTICE 'Usuário admin criado com sucesso!';
  ELSE
    RAISE NOTICE 'Falha ao criar usuário admin';
  END IF;
END $$;