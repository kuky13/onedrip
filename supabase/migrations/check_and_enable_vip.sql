-- Verificar o status atual do usuário
SELECT id, name, service_orders_vip_enabled 
FROM user_profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Habilitar VIP para todos os usuários (para teste)
UPDATE user_profiles 
SET service_orders_vip_enabled = true 
WHERE service_orders_vip_enabled = false;

-- Verificar novamente após a atualização
SELECT id, name, service_orders_vip_enabled 
FROM user_profiles 
ORDER BY created_at DESC 
LIMIT 5;