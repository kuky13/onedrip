-- Consultar orçamentos existentes para teste do PDF
SELECT 
  id,
  device_model,
  device_type,
  client_name,
  client_phone,
  part_type,
  cash_price,
  installment_price,
  installments,
  warranty_months,
  includes_delivery,
  includes_screen_protector,
  status,
  created_at
FROM budgets
ORDER BY created_at DESC
LIMIT 5;