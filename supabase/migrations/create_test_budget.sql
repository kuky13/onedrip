-- Criar um orçamento de teste para verificar a geração de PDF
-- Primeiro, vamos verificar se existe algum usuário
SELECT id, email FROM auth.users LIMIT 1;

-- Inserir um orçamento de teste (usando um UUID fixo para o user_id)
INSERT INTO budgets (
  id,
  owner_id,
  client_name,
  client_phone,
  device_type,
  device_model,
  notes,
  total_price,
  installment_price,
  installments,
  warranty_months,
  created_at,
  expires_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'João Silva',
  '(11) 99999-9999',
  'Smartphone',
  'iPhone 12 Pro',
  'Tela quebrada e bateria viciada. Cliente relatou que o aparelho caiu e a tela rachou.',
  450.00,
  150.00,
  3,
  6,
  NOW(),
  NOW() + INTERVAL '30 days'
) ON CONFLICT DO NOTHING;

-- Verificar se o orçamento foi criado
SELECT 
  id,
  client_name,
  device_model,
  total_price,
  created_at
FROM budgets 
ORDER BY created_at DESC 
LIMIT 3