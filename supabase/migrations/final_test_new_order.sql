-- Teste final: simular criação de nova ordem de serviço

-- 1. Verificar estado antes do teste
SELECT 
    'ANTES DO TESTE' as momento,
    COUNT(*) as total_orders,
    MAX(sequential_number) as ultimo_numero,
    (SELECT current_number FROM service_order_sequence WHERE id = 1) as contador_sequencia
FROM service_orders 
WHERE sequential_number IS NOT NULL
AND deleted_at IS NULL;

-- 2. Simular inserção de nova ordem (usando dados de teste)
INSERT INTO service_orders (
    owner_id,
    device_type,
    device_model,
    reported_issue,
    status,
    priority
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- ID fictício para teste
    'Smartphone',
    'Teste Numeração',
    'Teste do sistema de numeração sequencial corrigido',
    'opened',
    'medium'
);

-- 3. Verificar resultado após inserção
SELECT 
    'APÓS INSERÇÃO' as momento,
    id,
    sequential_number,
    device_model,
    created_at
FROM service_orders 
WHERE device_model = 'Teste Numeração'
AND deleted_at IS NULL;

-- 4. Verificar estado geral após o teste
SELECT 
    'ESTADO FINAL' as momento,
    COUNT(*) as total_orders,
    MIN(sequential_number) as primeiro_numero,
    MAX(sequential_number) as ultimo_numero,
    (SELECT current_number FROM service_order_sequence WHERE id = 1) as contador_sequencia
FROM service_orders 
WHERE sequential_number IS NOT NULL
AND deleted_at IS NULL;

-- 5. Verificar se a sequência está correta (sem gaps)
SELECT 
    'VERIFICAÇÃO GAPS' as tipo,
    sequential_number,
    LAG(sequential_number) OVER (ORDER BY sequential_number) as numero_anterior,
    sequential_number - LAG(sequential_number) OVER (ORDER BY sequential_number) as diferenca
FROM service_orders 
WHERE sequential_number IS NOT NULL
AND deleted_at IS NULL
ORDER BY sequential_number;

-- 6. Limpar dados de teste
DELETE FROM service_orders 
WHERE device_model = 'Teste Numeração';

-- 7. Ajustar contador após limpeza
UPDATE service_order_sequence 
SET current_number = COALESCE(
    (SELECT MAX(sequential_number) FROM service_orders WHERE sequential_number IS NOT NULL AND deleted_at IS NULL), 
    0
),
updated_at = NOW()
WHERE id = 1;

-- 8. Estado final após limpeza
SELECT 
    'APÓS LIMPEZA' as momento,
    COUNT(*) as total_orders,
    MAX(sequential_number) as ultimo_numero,
    (SELECT current_number FROM service_order_sequence WHERE id = 1) as contador_sequencia
FROM service_orders 
WHERE sequential_number IS NOT NULL
AND deleted_at IS NULL