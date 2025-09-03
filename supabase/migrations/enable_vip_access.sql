-- Verificar o status atual do usuário
SELECT 
  id,
  name,
  role,
  service_orders_vip_enabled
FROM user_profiles
WHERE id = auth.uid();

-- Habilitar acesso VIP para o usuário atual
UPDATE user_profiles 
SET service_orders_vip_enabled = true,
    updated_at = now()
WHERE id = auth.uid();

-- Verificar se a atualização foi bem-sucedida
SELECT 
  id,
  name,
  role,
  service_orders_vip_enabled,
  updated_at
FROM user_profiles
WHERE id = auth.uid();