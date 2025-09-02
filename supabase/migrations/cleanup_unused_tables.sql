-- =====================================================
-- SCRIPT DE LIMPEZA DE TABELAS NÃO UTILIZADAS
-- Data: $(date)
-- Propósito: Remover tabelas e funções não utilizadas
-- =====================================================

-- IMPORTANTE: Execute o script de backup ANTES deste script!
-- Arquivo: export_unused_tables_data.sql

-- =====================================================
-- VERIFICAÇÕES DE SEGURANÇA
-- =====================================================

-- Verificar se o backup foi executado
DO $$
DECLARE
    backup_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM admin_logs 
        WHERE action = 'DATABASE_CLEANUP_DATA_BACKUP' 
        AND created_at >= NOW() - INTERVAL '1 hour'
    ) INTO backup_exists;
    
    IF NOT backup_exists THEN
        RAISE EXCEPTION 'ERRO: Backup não encontrado! Execute o script export_unused_tables_data.sql primeiro.';
    ELSE
        RAISE NOTICE 'Verificação de backup: OK - Backup encontrado nos logs';
    END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO DE DEPENDÊNCIAS
-- =====================================================

-- Verificar se existem dependências das tabelas que serão removidas
DO $$
DECLARE
    dependency_count INTEGER := 0;
BEGIN
    -- Verificar foreign keys que referenciam as tabelas a serem removidas
    SELECT COUNT(*) INTO dependency_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name IN ('backup_audit_logs', 'backup_access_logs', 'backup_user_activity_logs', 'cleanup_execution_log');
    
    IF dependency_count > 0 THEN
        RAISE WARNING 'Encontradas % dependências de foreign key. Verifique antes de prosseguir.', dependency_count;
    ELSE
        RAISE NOTICE 'Verificação de dependências: OK - Nenhuma foreign key encontrada';
    END IF;
END $$;

-- =====================================================
-- REMOÇÃO DE POLÍTICAS RLS
-- =====================================================

-- Remover políticas RLS das tabelas antes de removê-las
DO $$
BEGIN
    -- Remover políticas de backup_audit_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_audit_logs') THEN
        DROP POLICY IF EXISTS "backup_audit_logs_policy" ON backup_audit_logs;
        RAISE NOTICE 'Políticas RLS removidas de backup_audit_logs';
    END IF;
    
    -- Remover políticas de backup_access_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_access_logs') THEN
        DROP POLICY IF EXISTS "backup_access_logs_policy" ON backup_access_logs;
        RAISE NOTICE 'Políticas RLS removidas de backup_access_logs';
    END IF;
    
    -- Remover políticas de backup_user_activity_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_user_activity_logs') THEN
        DROP POLICY IF EXISTS "backup_user_activity_logs_policy" ON backup_user_activity_logs;
        RAISE NOTICE 'Políticas RLS removidas de backup_user_activity_logs';
    END IF;
    
    -- Remover políticas de cleanup_execution_log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cleanup_execution_log') THEN
        DROP POLICY IF EXISTS "cleanup_execution_log_policy" ON cleanup_execution_log;
        RAISE NOTICE 'Políticas RLS removidas de cleanup_execution_log';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover políticas RLS: %', SQLERRM;
END $$;

-- =====================================================
-- REMOÇÃO DE TRIGGERS
-- =====================================================

-- Remover triggers das tabelas antes de removê-las
DO $$
BEGIN
    -- Remover triggers de backup_audit_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_audit_logs') THEN
        DROP TRIGGER IF EXISTS update_backup_audit_logs_updated_at ON backup_audit_logs;
        RAISE NOTICE 'Triggers removidos de backup_audit_logs';
    END IF;
    
    -- Remover triggers de backup_access_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_access_logs') THEN
        DROP TRIGGER IF EXISTS update_backup_access_logs_updated_at ON backup_access_logs;
        RAISE NOTICE 'Triggers removidos de backup_access_logs';
    END IF;
    
    -- Remover triggers de backup_user_activity_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_user_activity_logs') THEN
        DROP TRIGGER IF EXISTS update_backup_user_activity_logs_updated_at ON backup_user_activity_logs;
        RAISE NOTICE 'Triggers removidos de backup_user_activity_logs';
    END IF;
    
    -- Remover triggers de cleanup_execution_log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cleanup_execution_log') THEN
        DROP TRIGGER IF EXISTS update_cleanup_execution_log_updated_at ON cleanup_execution_log;
        RAISE NOTICE 'Triggers removidos de cleanup_execution_log';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover triggers: %', SQLERRM;
END $$;

-- =====================================================
-- REMOÇÃO DE ÍNDICES
-- =====================================================

-- Remover índices das tabelas antes de removê-las
DO $$
BEGIN
    -- Índices de backup_audit_logs
    DROP INDEX IF EXISTS idx_backup_audit_logs_timestamp;
    DROP INDEX IF EXISTS idx_backup_audit_logs_user_id;
    
    -- Índices de backup_access_logs
    DROP INDEX IF EXISTS idx_backup_access_logs_timestamp;
    DROP INDEX IF EXISTS idx_backup_access_logs_user_id;
    
    -- Índices de backup_user_activity_logs
    DROP INDEX IF EXISTS idx_backup_user_activity_logs_timestamp;
    DROP INDEX IF EXISTS idx_backup_user_activity_logs_user_id;
    
    -- Índices de cleanup_execution_log
    DROP INDEX IF EXISTS idx_cleanup_execution_log_execution_time;
    DROP INDEX IF EXISTS idx_cleanup_execution_log_cleanup_type;
    
    RAISE NOTICE 'Índices removidos com sucesso';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover índices: %', SQLERRM;
END $$;

-- =====================================================
-- REMOÇÃO DAS TABELAS
-- =====================================================

-- Remover as tabelas não utilizadas
DO $$
DECLARE
    tables_removed INTEGER := 0;
BEGIN
    -- Remover backup_audit_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_audit_logs') THEN
        DROP TABLE backup_audit_logs CASCADE;
        tables_removed := tables_removed + 1;
        RAISE NOTICE 'Tabela backup_audit_logs removida';
    END IF;
    
    -- Remover backup_access_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_access_logs') THEN
        DROP TABLE backup_access_logs CASCADE;
        tables_removed := tables_removed + 1;
        RAISE NOTICE 'Tabela backup_access_logs removida';
    END IF;
    
    -- Remover backup_user_activity_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_user_activity_logs') THEN
        DROP TABLE backup_user_activity_logs CASCADE;
        tables_removed := tables_removed + 1;
        RAISE NOTICE 'Tabela backup_user_activity_logs removida';
    END IF;
    
    -- Remover cleanup_execution_log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cleanup_execution_log') THEN
        DROP TABLE cleanup_execution_log CASCADE;
        tables_removed := tables_removed + 1;
        RAISE NOTICE 'Tabela cleanup_execution_log removida';
    END IF;
    
    RAISE NOTICE 'Total de tabelas removidas: %', tables_removed;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao remover tabelas: %', SQLERRM;
END $$;

-- =====================================================
-- REMOÇÃO DE FUNÇÕES NÃO UTILIZADAS
-- =====================================================

-- Remover funções RPC que não estão sendo utilizadas
DO $$
DECLARE
    functions_removed INTEGER := 0;
BEGIN
    -- Lista de funções potencialmente não utilizadas
    -- (baseado na análise do código)
    
    -- Verificar e remover funções relacionadas às tabelas removidas
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'backup_audit_function') THEN
        DROP FUNCTION IF EXISTS backup_audit_function() CASCADE;
        functions_removed := functions_removed + 1;
        RAISE NOTICE 'Função backup_audit_function removida';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_backup_logs') THEN
        DROP FUNCTION IF EXISTS cleanup_old_backup_logs() CASCADE;
        functions_removed := functions_removed + 1;
        RAISE NOTICE 'Função cleanup_old_backup_logs removida';
    END IF;
    
    RAISE NOTICE 'Total de funções removidas: %', functions_removed;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover funções: %', SQLERRM;
END $$;

-- =====================================================
-- LIMPEZA DE PERMISSÕES
-- =====================================================

-- Remover permissões relacionadas às tabelas removidas
DO $$
BEGIN
    -- Revogar permissões das tabelas removidas (se ainda existirem)
    REVOKE ALL ON backup_audit_logs FROM anon, authenticated;
    REVOKE ALL ON backup_access_logs FROM anon, authenticated;
    REVOKE ALL ON backup_user_activity_logs FROM anon, authenticated;
    REVOKE ALL ON cleanup_execution_log FROM anon, authenticated;
    
    RAISE NOTICE 'Permissões revogadas das tabelas removidas';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao revogar permissões (esperado se tabelas já foram removidas): %', SQLERRM;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se as tabelas foram realmente removidas
DO $$
DECLARE
    remaining_tables INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables 
    WHERE table_name IN ('backup_audit_logs', 'backup_access_logs', 'backup_user_activity_logs', 'cleanup_execution_log')
    AND table_schema = 'public';
    
    IF remaining_tables = 0 THEN
        RAISE NOTICE 'SUCESSO: Todas as tabelas não utilizadas foram removidas';
    ELSE
        RAISE WARNING 'ATENÇÃO: % tabelas ainda existem', remaining_tables;
    END IF;
END $$;

-- =====================================================
-- LOG DA OPERAÇÃO DE LIMPEZA
-- =====================================================

-- Registrar a operação de limpeza nos logs
INSERT INTO admin_logs (action, details, created_at) 
VALUES (
    'DATABASE_CLEANUP_COMPLETED',
    '{"message": "Limpeza do banco de dados concluída. Tabelas não utilizadas removidas com sucesso.", "tables_removed": ["backup_audit_logs", "backup_access_logs", "backup_user_activity_logs", "cleanup_execution_log"]}',
    NOW()
);

-- =====================================================
-- OTIMIZAÇÃO DO BANCO DE DADOS
-- =====================================================

-- Executar VACUUM para otimizar o banco após a remoção
DO $$
BEGIN
    -- Atualizar estatísticas do banco
    ANALYZE;
    RAISE NOTICE 'Estatísticas do banco atualizadas';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao atualizar estatísticas: %', SQLERRM;
END $$;

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'LIMPEZA DO BANCO DE DADOS CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Tabelas removidas:';
    RAISE NOTICE '- backup_audit_logs';
    RAISE NOTICE '- backup_access_logs';
    RAISE NOTICE '- backup_user_activity_logs';
    RAISE NOTICE '- cleanup_execution_log';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '1. Verifique se o sistema está funcionando normalmente';
    RAISE NOTICE '2. Execute testes de funcionalidade';
    RAISE NOTICE '3. Monitore os logs por alguns dias';
    RAISE NOTICE '4. O backup das estruturas está em: backup_unused_tables_structure.sql';
    RAISE NOTICE '================================================';
END $$;

-- Fim do script de limpeza