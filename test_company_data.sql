-- Consultar dados da empresa para teste do PDF
SELECT 
  shop_name,
  address,
  contact_phone,
  cnpj,
  logo_url,
  created_at
FROM shop_profiles
LIMIT 5;

-- Consultar dados da company_info também
SELECT 
  name,
  address,
  phone,
  email,
  logo_url,
  whatsapp_phone
FROM company_info
LIMIT 5;