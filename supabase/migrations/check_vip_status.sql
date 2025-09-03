-- Verificar e habilitar VIP para ordens de serviço
-- Primeiro, vamos verificar o status atual
SELECT 
  id,
  name,
  service_orders_vip_enabled,
  advanced_features_enabled
FROM user_profiles
ORDER BY created_at DESC
LIMIT 5;

-- Habilitar VIP para todos os usuários (para teste)
UPDATE user_profiles 
SET service_orders_vip_enabled = true
WHERE service_orders_vip_enabled = false OR service_orders_vip_enabled IS NULL;

-- Verificar novamente após a atualização
SELECT 
  id,
  name,
  service_orders_vip_enabled,
  advanced_features_enabled
FROM user_profiles
ORDER BY created_at DESC
LIMIT 5;