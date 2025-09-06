-- Verificar orçamentos existentes
SELECT 
    id,
    client_name,
    client_phone,
    device_type,
    device_model,
    total_price,
    created_at
FROM budgets 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar dados da empresa
SELECT 
    shop_name,
    address,
    contact_phone,
    cnpj,
    logo_url
FROM shop_profiles 
LIMIT 1;

SELECT 
    name,
    address,
    phone,
    email,
    logo_url
FROM company_info 
LIMIT 1;