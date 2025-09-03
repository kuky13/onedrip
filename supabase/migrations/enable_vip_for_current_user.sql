-- Enable VIP access for service orders for the current user
-- This migration enables the service_orders_vip_enabled flag for all existing users
-- so they can access the "Create Service Order" functionality in budget cards

-- Update all existing users to have VIP access enabled
UPDATE user_profiles 
SET service_orders_vip_enabled = true 
WHERE service_orders_vip_enabled = false OR service_orders_vip_enabled IS NULL;

-- Verify the update
SELECT id, name, service_orders_vip_enabled 
FROM user_profiles 
WHERE service_orders_vip_enabled = true;