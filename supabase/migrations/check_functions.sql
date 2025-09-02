-- Verificar a definição da função generate_sequential_number
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'generate_sequential_number'
AND routine_schema = 'public';

-- Verificar triggers relacionados
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'service_orders'
AND trigger_schema = 'public';

-- Verificar se há transações em rollback ou problemas de concorrência
-- Testar a função manualmente
SELECT generate_sequential_number() as test_sequential_1;
SELECT generate_sequential_number() as test_sequential_2;
SELECT generate_sequential_number() as test_sequential_3;

-- Verificar estado após os testes
SELECT current_number FROM service_order_sequence WHERE id = 1;