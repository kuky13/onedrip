-- Inserir dados de teste da empresa se não existirem

-- Primeiro, verificar se já existem dados
SELECT COUNT(*) as total_shop_profiles FROM shop_profiles;
SELECT COUNT(*) as total_company_info FROM company_info;

-- Inserir dados na tabela shop_profiles se não existir
INSERT INTO shop_profiles (
  id,
  user_id,
  shop_name,
  address,
  contact_phone,
  cnpj,
  logo_url,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'OneDrip Assistência Técnica',
  'Rua das Flores, 123, Centro, São Paulo - SP, CEP: 01234-567',
  '(11) 98765-4321',
  '12.345.678/0001-90',
  'https://via.placeholder.com/150x150/007bff/ffffff?text=LOGO',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM shop_profiles LIMIT 1);

-- Inserir dados na tabela company_info se não existir
INSERT INTO company_info (
  id,
  owner_id,
  name,
  address,
  phone,
  email,
  logo_url,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM user_profiles LIMIT 1),
  'OneDrip Assistência Técnica',
  'Rua das Flores, 123, Centro, São Paulo - SP, CEP: 01234-567',
  '(11) 98765-4321',
  'contato@onedrip.com.br',
  'https://via.placeholder.com/150x150/007bff/ffffff?text=LOGO',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM company_info LIMIT 1);

-- Verificar os dados inseridos
SELECT 'shop_profiles' as tabela, shop_name as nome, address, contact_phone as telefone, cnpj, logo_url FROM shop_profiles
UNION ALL
SELECT 'company_info' as tabela, name as nome, address, phone as telefone, email as cnpj, logo_url FROM company_info;