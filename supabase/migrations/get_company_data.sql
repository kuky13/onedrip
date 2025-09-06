-- Verificar dados da empresa salvos nas configurações

-- Verificar dados em shop_profiles
SELECT 
  'shop_profiles' as table_name,
  shop_name,
  contact_phone,
  cnpj,
  user_id,
  created_at
FROM shop_profiles
ORDER BY created_at DESC
LIMIT 5;

-- Verificar dados em company_info
SELECT 
  'company_info' as table_name,
  name,
  whatsapp_phone,
  business_hours,
  owner_id,
  created_at
FROM company_info
ORDER BY created_at DESC
LIMIT 5;

-- Verificar se há usuários autenticados
SELECT 
  'auth_users' as table_name,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 3;

-- Verificar orçamentos existentes
SELECT 
  'budgets' as table_name,
  id,
  client_name,
  device_model,
  total_price,
  owner_id,
  created_at
FROM budgets
ORDER BY created_at DESC
LIMIT 3;