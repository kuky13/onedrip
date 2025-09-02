-- Corrigir o problema de numeração sequencial
-- O problema está na função que incrementa o contador mesmo em caso de rollback

-- 1. Primeiro, vamos corrigir a numeração existente
-- Resetar a sequência baseada nos números realmente utilizados
UPDATE service_order_sequence 
SET current_number = COALESCE(
    (SELECT MAX(sequential_number) FROM service_orders WHERE sequential_number IS NOT NULL), 
    0
)
WHERE id = 1;

-- 2. Recriar a função generate_sequential_number com lógica mais robusta
CREATE OR REPLACE FUNCTION generate_sequential_number()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    next_number INTEGER;
    max_attempts INTEGER := 10;
    attempt_count INTEGER := 0;
BEGIN
    -- Loop para tentar obter um número sequencial único
    LOOP
        attempt_count := attempt_count + 1;
        
        -- Se exceder o número máximo de tentativas, raise exception
        IF attempt_count > max_attempts THEN
            RAISE EXCEPTION 'Não foi possível gerar número sequencial após % tentativas', max_attempts;
        END IF;
        
        -- Obter o próximo número disponível
        SELECT COALESCE(MIN(t.missing_number), 
                       COALESCE(MAX(sequential_number), 0) + 1)
        INTO next_number
        FROM (
            SELECT generate_series(1, COALESCE(MAX(sequential_number), 0) + 1) AS missing_number
            FROM service_orders
            WHERE sequential_number IS NOT NULL
        ) t
        LEFT JOIN service_orders so ON t.missing_number = so.sequential_number
        WHERE so.sequential_number IS NULL;
        
        -- Se o número for maior que 9999, resetar para 1
        IF next_number > 9999 THEN
            next_number := 1;
            
            -- Atualizar o timestamp de reset
            UPDATE service_order_sequence 
            SET last_reset_at = NOW(), 
                updated_at = NOW()
            WHERE id = 1;
        END IF;
        
        -- Verificar se o número já existe (proteção contra concorrência)
        IF NOT EXISTS (SELECT 1 FROM service_orders WHERE sequential_number = next_number) THEN
            -- Atualizar o contador na tabela de sequência
            UPDATE service_order_sequence 
            SET current_number = next_number,
                updated_at = NOW()
            WHERE id = 1;
            
            RETURN next_number;
        END IF;
        
        -- Se chegou aqui, o número já existe, tentar novamente
    END LOOP;
END;
$$;

-- 3. Recriar o trigger para usar a nova função
DROP TRIGGER IF EXISTS assign_sequential_number ON service_orders;

CREATE OR REPLACE FUNCTION assign_sequential_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Só atribuir número sequencial se não foi fornecido
    IF NEW.sequential_number IS NULL THEN
        NEW.sequential_number := generate_sequential_number();
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER assign_sequential_number
    BEFORE INSERT ON service_orders
    FOR EACH ROW
    EXECUTE FUNCTION assign_sequential_number_trigger();

-- 4. Corrigir os números sequenciais existentes para eliminar gaps
-- Primeiro, criar uma tabela temporária com a numeração correta
WITH numbered_orders AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at, id) as new_sequential_number
    FROM service_orders 
    WHERE sequential_number IS NOT NULL
    AND deleted_at IS NULL
)
UPDATE service_orders 
SET sequential_number = numbered_orders.new_sequential_number
FROM numbered_orders
WHERE service_orders.id = numbered_orders.id;

-- 5. Atualizar o contador final
UPDATE service_order_sequence 
SET current_number = COALESCE(
    (SELECT MAX(sequential_number) FROM service_orders WHERE sequential_number IS NOT NULL), 
    0
),
updated_at = NOW()
WHERE id = 1;

-- 6. Verificar o resultado
SELECT 
    'Resultado da correção' as status,
    COUNT(*) as total_orders,
    MIN(sequential_number) as min_number,
    MAX(sequential_number) as max_number,
    (SELECT current_number FROM service_order_sequence WHERE id = 1) as sequence_counter
FROM service_orders 
WHERE sequential_number IS NOT NULL
AND deleted_at IS NULL;