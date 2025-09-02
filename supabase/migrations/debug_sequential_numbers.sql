-- Consulta para investigar o problema de numeração sequencial

-- 1. Verificar estado atual da tabela service_order_sequence
SELECT 
    'service_order_sequence' as table_name,
    id,
    current_number,
    last_reset_at,
    created_at,
    updated_at
FROM service_order_sequence;

-- 2. Verificar dados das ordens de serviço com números sequenciais
SELECT 
    'service_orders' as table_name,
    id,
    sequential_number,
    created_at,
    updated_at
FROM service_orders 
WHERE sequential_number IS NOT NULL
ORDER BY sequential_number;

-- 3. Verificar se há gaps na numeração sequencial
SELECT 
    'gaps_analysis' as analysis_type,
    sequential_number,
    LAG(sequential_number) OVER (ORDER BY sequential_number) as previous_number,
    sequential_number - LAG(sequential_number) OVER (ORDER BY sequential_number) as gap
FROM service_orders 
WHERE sequential_number IS NOT NULL
ORDER BY sequential_number;

-- 4. Verificar se há números duplicados
SELECT 
    'duplicates_check' as analysis_type,
    sequential_number,
    COUNT(*) as count
FROM service_orders 
WHERE sequential_number IS NOT NULL
GROUP BY sequential_number
HAVING COUNT(*) > 1;

-- 5. Verificar total de registros vs último número sequencial
SELECT 
    'count_analysis' as analysis_type,
    COUNT(*) as total_orders_with_sequential,
    MAX(sequential_number) as max_sequential_number,
    (SELECT current_number FROM service_order_sequence WHERE id = 1) as sequence_counter
FROM service_orders 
WHERE sequential_number IS NOT NULL;