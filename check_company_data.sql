-- Verificar dados da empresa nas tabelas
SELECT 'shop_profiles' as table_name, shop_name as name, address, contact_phone as phone, cnpj, logo_url FROM shop_profiles
UNION ALL
SELECT 'company_info' as table_name, name, address, phone, NULL as cnpj, logo_url FROM company_info;