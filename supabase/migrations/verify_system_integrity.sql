-- =====================================================
-- SCRIPT DE VERIFICAÇÃO DE INTEGRIDADE DO SISTEMA
-- Data: $(date)
-- Propósito: Verificar se o sistema está funcionando após a limpeza
-- =====================================================

-- Este script verifica se todas as funcionalidades essenciais
-- estão funcionando corretamente após a remoção das tabelas não utilizadas

-- =====================================================
-- VERIFICAÇÃO DE TABELAS ESSENCIAIS
-- =====================================================

DO $$
DECLARE
    essential_tables TEXT[] := ARRAY[
        'budgets', 'budget_parts', 'clients', 'user_profiles', 
        'licenses', 'service_orders', 'service_order_items',
        'service_order_events', 'service_order_attachments',
        'admin_logs', 'audit_logs', 'access_logs', 'user_activity_logs',
        'notifications', 'user_notifications', 'user_push_subscriptions',
        'shop_profiles', 'site_settings', 'device_types', 'warranty_periods'
    ];
    tbl_name TEXT;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_count INTEGER;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VERIFICAÇÃO DE INTEGRIDADE DO SISTEMA';
    RAISE NOTICE '================================================';
    
    -- Verificar se todas as tabelas essenciais existem
    FOREACH tbl_name IN ARRAY essential_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_name = tbl_name AND table_schema = 'public';
        
        IF table_count = 0 THEN
            missing_tables := array_append(missing_tables, tbl_name);
            RAISE WARNING 'ERRO: Tabela essencial % não encontrada!', tbl_name;
        ELSE
            RAISE NOTICE 'OK: Tabela % existe', tbl_name;
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: Tabelas essenciais estão faltando: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'SUCESSO: Todas as tabelas essenciais estão presentes';
    END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO DE FUNÇÕES RPC ESSENCIAIS
-- =====================================================

DO $$
DECLARE
    essential_functions TEXT[] := ARRAY[
        'is_current_user_admin', 'get_user_role', 'activate_license',
        'admin_get_all_users', 'get_optimized_budgets', 'soft_delete_budget_with_audit',
        'restore_deleted_budget', 'send_push_notification', 'get_user_notifications',
        'mark_notification_as_read', 'log_security_event', 'audit_rls_policies'
    ];
    func_name TEXT;
    missing_functions TEXT[] := ARRAY[]::TEXT[];
    function_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Verificando funções RPC essenciais...';
    
    -- Verificar se todas as funções essenciais existem
    FOREACH func_name IN ARRAY essential_functions
    LOOP
        SELECT COUNT(*) INTO function_count
        FROM pg_proc 
        WHERE proname = func_name;
        
        IF function_count = 0 THEN
            missing_functions := array_append(missing_functions, func_name);
            RAISE WARNING 'ERRO: Função essencial % não encontrada!', func_name;
        ELSE
            RAISE NOTICE 'OK: Função % existe', func_name;
        END IF;
    END LOOP;
    
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE WARNING 'ATENÇÃO: Funções essenciais estão faltando: %', array_to_string(missing_functions, ', ');
    ELSE
        RAISE NOTICE 'SUCESSO: Todas as funções essenciais estão presentes';
    END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO DE POLÍTICAS RLS
-- =====================================================

DO $$
DECLARE
    rls_enabled_count INTEGER;
    total_tables INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Verificando políticas RLS...';
    
    -- Contar tabelas com RLS habilitado
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true;
    
    -- Contar total de tabelas
    SELECT COUNT(*) INTO total_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE 'Tabelas com RLS habilitado: % de %', rls_enabled_count, total_tables;
    
    IF rls_enabled_count > 0 THEN
        RAISE NOTICE 'SUCESSO: RLS está configurado em algumas tabelas';
    ELSE
        RAISE WARNING 'ATENÇÃO: Nenhuma tabela tem RLS habilitado';
    END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO DE PERMISSÕES
-- =====================================================

DO $$
DECLARE
    anon_permissions INTEGER;
    auth_permissions INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Verificando permissões...';
    
    -- Contar permissões para anon
    SELECT COUNT(*) INTO anon_permissions
    FROM information_schema.role_table_grants 
    WHERE grantee = 'anon' AND table_schema = 'public';
    
    -- Contar permissões para authenticated
    SELECT COUNT(*) INTO auth_permissions
    FROM information_schema.role_table_grants 
    WHERE grantee = 'authenticated' AND table_schema = 'public';
    
    RAISE NOTICE 'Permissões para anon: %', anon_permissions;
    RAISE NOTICE 'Permissões para authenticated: %', auth_permissions;
    
    IF anon_permissions > 0 OR auth_permissions > 0 THEN
        RAISE NOTICE 'SUCESSO: Permissões estão configuradas';
    ELSE
        RAISE WARNING 'ATENÇÃO: Poucas permissões configuradas';
    END IF;
END $$;

-- =====================================================
-- TESTE DE FUNCIONALIDADES BÁSICAS
-- =====================================================

DO $$
DECLARE
    test_result BOOLEAN;
    error_message TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Testando funcionalidades básicas...';
    
    -- Teste 1: Verificar se é possível consultar budgets
    BEGIN
        PERFORM COUNT(*) FROM budgets LIMIT 1;
        RAISE NOTICE 'OK: Consulta à tabela budgets funcionando';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'ERRO: Problema ao consultar budgets: %', SQLERRM;
    END;
    
    -- Teste 2: Verificar se é possível consultar user_profiles
    BEGIN
        PERFORM COUNT(*) FROM user_profiles LIMIT 1;
        RAISE NOTICE 'OK: Consulta à tabela user_profiles funcionando';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'ERRO: Problema ao consultar user_profiles: %', SQLERRM;
    END;
    
    -- Teste 3: Verificar se é possível consultar licenses
    BEGIN
        PERFORM COUNT(*) FROM licenses LIMIT 1;
        RAISE NOTICE 'OK: Consulta à tabela licenses funcionando';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'ERRO: Problema ao consultar licenses: %', SQLERRM;
    END;
    
    -- Teste 4: Verificar se é possível consultar service_orders
    BEGIN
        PERFORM COUNT(*) FROM service_orders LIMIT 1;
        RAISE NOTICE 'OK: Consulta à tabela service_orders funcionando';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'ERRO: Problema ao consultar service_orders: %', SQLERRM;
    END;
    
    -- Teste 5: Verificar se é possível consultar admin_logs
    BEGIN
        PERFORM COUNT(*) FROM admin_logs LIMIT 1;
        RAISE NOTICE 'OK: Consulta à tabela admin_logs funcionando';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'ERRO: Problema ao consultar admin_logs: %', SQLERRM;
    END;
END $$;

-- =====================================================
-- VERIFICAÇÃO DE FOREIGN KEYS
-- =====================================================

DO $$
DECLARE
    fk_count INTEGER;
    broken_fks INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Verificando foreign keys...';
    
    -- Contar foreign keys existentes
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Total de foreign keys: %', fk_count;
    
    -- Verificar se há foreign keys quebradas (isso seria detectado em consultas)
    -- Por enquanto, apenas reportamos o número
    IF fk_count > 0 THEN
        RAISE NOTICE 'SUCESSO: Foreign keys estão presentes';
    ELSE
        RAISE NOTICE 'INFO: Nenhuma foreign key encontrada (pode ser intencional)';
    END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO DE ÍNDICES
-- =====================================================

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Verificando índices...';
    
    -- Contar índices personalizados (excluindo os automáticos)
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'  -- Excluir primary keys
    AND indexname NOT LIKE '%_key';  -- Excluir unique keys automáticas
    
    RAISE NOTICE 'Índices personalizados: %', index_count;
    
    IF index_count > 0 THEN
        RAISE NOTICE 'SUCESSO: Índices personalizados estão presentes';
    ELSE
        RAISE NOTICE 'INFO: Poucos índices personalizados (pode impactar performance)';
    END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO DE TABELAS REMOVIDAS
-- =====================================================

DO $$
DECLARE
    removed_tables TEXT[] := ARRAY[
        'backup_audit_logs', 'backup_access_logs', 
        'backup_user_activity_logs', 'cleanup_execution_log'
    ];
    removed_tbl_name TEXT;
    still_exists TEXT[] := ARRAY[]::TEXT[];
    table_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Verificando se tabelas foram removidas...';
    
    -- Verificar se as tabelas foram realmente removidas
    FOREACH removed_tbl_name IN ARRAY removed_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_name = removed_tbl_name AND table_schema = 'public';
        
        IF table_count > 0 THEN
            still_exists := array_append(still_exists, removed_tbl_name);
            RAISE WARNING 'ATENÇÃO: Tabela % ainda existe!', removed_tbl_name;
        ELSE
            RAISE NOTICE 'OK: Tabela % foi removida com sucesso', removed_tbl_name;
        END IF;
    END LOOP;
    
    IF array_length(still_exists, 1) > 0 THEN
        RAISE WARNING 'ATENÇÃO: Algumas tabelas não foram removidas: %', array_to_string(still_exists, ', ');
    ELSE
        RAISE NOTICE 'SUCESSO: Todas as tabelas não utilizadas foram removidas';
    END IF;
END $$;

-- =====================================================
-- ESTATÍSTICAS FINAIS
-- =====================================================

DO $$
DECLARE
    total_tables INTEGER;
    total_functions INTEGER;
    total_indexes INTEGER;
    database_size TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'ESTATÍSTICAS FINAIS DO BANCO DE DADOS';
    RAISE NOTICE '================================================';
    
    -- Contar tabelas
    SELECT COUNT(*) INTO total_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public';
    
    -- Contar funções
    SELECT COUNT(*) INTO total_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
    
    -- Contar índices
    SELECT COUNT(*) INTO total_indexes
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    -- Tamanho do banco (aproximado)
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO database_size;
    
    RAISE NOTICE 'Total de tabelas: %', total_tables;
    RAISE NOTICE 'Total de funções: %', total_functions;
    RAISE NOTICE 'Total de índices: %', total_indexes;
    RAISE NOTICE 'Tamanho do banco: %', database_size;
    RAISE NOTICE '================================================';
END $$;

-- =====================================================
-- LOG DA VERIFICAÇÃO
-- =====================================================

-- Registrar que a verificação foi executada
INSERT INTO admin_logs (action, details, created_at) 
VALUES (
    'DATABASE_INTEGRITY_CHECK',
    '{"message": "Verificação de integridade do sistema executada após limpeza do banco de dados", "status": "completed"}',
    NOW()
);

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VERIFICAÇÃO DE INTEGRIDADE CONCLUÍDA';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Se não houve erros críticos acima, o sistema está';
    RAISE NOTICE 'funcionando corretamente após a limpeza.';
    RAISE NOTICE '';
    RAISE NOTICE 'Recomendações:';
    RAISE NOTICE '1. Teste as funcionalidades principais do sistema';
    RAISE NOTICE '2. Monitore os logs por alguns dias';
    RAISE NOTICE '3. Execute backups regulares';
    RAISE NOTICE '4. Considere otimizações de performance se necessário';
    RAISE NOTICE '================================================';
END $$;

-- Fim do script de verificação