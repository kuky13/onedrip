-- Testar a correção da numeração sequencial

-- 1. Verificar estado atual após a correção
SELECT 
    'Estado atual' as status,
    id,
    sequential_number,
    created_at
FROM service_orders 
WHERE sequential_number IS NOT NULL
AND deleted_at IS NULL
ORDER BY sequential_number;

-- 2. Verificar contador da sequência
SELECT 
    'Contador sequência' as status,
    current_number,
    last_reset_at
FROM service_order_sequence 
WHERE id = 1;

-- 3. Testar criação de nova ordem (simulação)
-- Primeiro vamos testar a função diretamente
SELECT 
    'Teste função' as status,
    generate_sequential_number() as next_number;

-- 4. Verificar se não há gaps na numeração
SELECT 
    'Análise de gaps' as status,
    sequential_number,
    LAG(sequential_number) OVER (ORDER BY sequential_number) as previous_number,
    sequential_number - LAG(sequential_number) OVER (ORDER BY sequential_number) as gap
FROM service_orders 
WHERE sequential_number IS NOT NULL
AND deleted_at IS NULL
ORDER BY sequential_number;

-- 5. Verificar se há duplicatas
SELECT 
    'Verificação duplicatas' as status,
    sequential_number,
    COUNT(*) as count
FROM service_orders 
WHERE sequential_number IS NOT NULL
AND deleted_at IS NULL
GROUP BY sequential_number
HAVING COUNT(*) > 1;

-- 6. Estatísticas finais
SELECT 
    'Estatísticas finais' as status,
    COUNT(*) as total_orders,
    MIN(sequential_number) as primeiro_numero,
    MAX(sequential_number) as ultimo_numero,
    MAX(sequential_number) - MIN(sequential_number) + 1 as range_esperado,
    COUNT(*) as range_real,
    CASE 
        WHEN MAX(sequential_number) - MIN(sequential_number) + 1 = COUNT(*) 
        THEN 'SEM GAPS' 
        ELSE 'COM GAPS' 
    END as status_gaps
FROM service_orders 
WHERE sequential_number IS NOT NULL
AND deleted_at IS NULL;