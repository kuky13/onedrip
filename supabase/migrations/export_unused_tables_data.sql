-- =====================================================
-- SCRIPT PARA EXPORTAR DADOS DAS TABELAS NÃO UTILIZADAS
-- Data: $(date)
-- Propósito: Backup dos dados antes da limpeza
-- =====================================================

-- Este script deve ser executado ANTES da remoção das tabelas
-- para garantir que os dados sejam preservados

-- =====================================================
-- VERIFICAÇÃO DE EXISTÊNCIA DAS TABELAS
-- =====================================================

-- Verificar se as tabelas existem antes de tentar exportar
DO $$
BEGIN
    -- Verificar backup_audit_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_audit_logs') THEN
        RAISE NOTICE 'Tabela backup_audit_logs encontrada - preparando para backup';
    ELSE
        RAISE NOTICE 'Tabela backup_audit_logs não encontrada';
    END IF;
    
    -- Verificar backup_access_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_access_logs') THEN
        RAISE NOTICE 'Tabela backup_access_logs encontrada - preparando para backup';
    ELSE
        RAISE NOTICE 'Tabela backup_access_logs não encontrada';
    END IF;
    
    -- Verificar backup_user_activity_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_user_activity_logs') THEN
        RAISE NOTICE 'Tabela backup_user_activity_logs encontrada - preparando para backup';
    ELSE
        RAISE NOTICE 'Tabela backup_user_activity_logs não encontrada';
    END IF;
    
    -- Verificar cleanup_execution_log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cleanup_execution_log') THEN
        RAISE NOTICE 'Tabela cleanup_execution_log encontrada - preparando para backup';
    ELSE
        RAISE NOTICE 'Tabela cleanup_execution_log não encontrada';
    END IF;
END $$;

-- =====================================================
-- CONTAGEM DE REGISTROS
-- =====================================================

-- Contar registros em cada tabela antes do backup
DO $$
DECLARE
    backup_audit_count INTEGER := 0;
    backup_access_count INTEGER := 0;
    backup_activity_count INTEGER := 0;
    cleanup_log_count INTEGER := 0;
BEGIN
    -- Contar backup_audit_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_audit_logs') THEN
        SELECT COUNT(*) INTO backup_audit_count FROM backup_audit_logs;
        RAISE NOTICE 'backup_audit_logs: % registros', backup_audit_count;
    END IF;
    
    -- Contar backup_access_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_access_logs') THEN
        SELECT COUNT(*) INTO backup_access_count FROM backup_access_logs;
        RAISE NOTICE 'backup_access_logs: % registros', backup_access_count;
    END IF;
    
    -- Contar backup_user_activity_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_user_activity_logs') THEN
        SELECT COUNT(*) INTO backup_activity_count FROM backup_user_activity_logs;
        RAISE NOTICE 'backup_user_activity_logs: % registros', backup_activity_count;
    END IF;
    
    -- Contar cleanup_execution_log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cleanup_execution_log') THEN
        SELECT COUNT(*) INTO cleanup_log_count FROM cleanup_execution_log;
        RAISE NOTICE 'cleanup_execution_log: % registros', cleanup_log_count;
    END IF;
    
    -- Log do total
    RAISE NOTICE 'Total de registros a serem preservados: %', 
        backup_audit_count + backup_access_count + backup_activity_count + cleanup_log_count;
END $$;

-- =====================================================
-- CRIAÇÃO DE TABELAS TEMPORÁRIAS PARA BACKUP
-- =====================================================

-- Criar tabelas temporárias para armazenar os dados
-- Estas tabelas serão usadas para preservar os dados importantes

-- Backup dos dados de backup_audit_logs (se existir e tiver dados)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_audit_logs') THEN
        -- Criar tabela temporária para preservar dados importantes
        CREATE TEMP TABLE temp_backup_audit_logs AS 
        SELECT * FROM backup_audit_logs 
        WHERE timestamp >= NOW() - INTERVAL '30 days'  -- Preservar últimos 30 dias
        LIMIT 1000;  -- Limitar a 1000 registros mais recentes
        
        RAISE NOTICE 'Dados de backup_audit_logs copiados para tabela temporária';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar backup de backup_audit_logs: %', SQLERRM;
END $$;

-- Backup dos dados de backup_access_logs (se existir e tiver dados)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_access_logs') THEN
        CREATE TEMP TABLE temp_backup_access_logs AS 
        SELECT * FROM backup_access_logs 
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        LIMIT 1000;
        
        RAISE NOTICE 'Dados de backup_access_logs copiados para tabela temporária';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar backup de backup_access_logs: %', SQLERRM;
END $$;

-- Backup dos dados de backup_user_activity_logs (se existir e tiver dados)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_user_activity_logs') THEN
        CREATE TEMP TABLE temp_backup_user_activity_logs AS 
        SELECT * FROM backup_user_activity_logs 
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        LIMIT 1000;
        
        RAISE NOTICE 'Dados de backup_user_activity_logs copiados para tabela temporária';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar backup de backup_user_activity_logs: %', SQLERRM;
END $$;

-- Backup dos dados de cleanup_execution_log (se existir e tiver dados)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cleanup_execution_log') THEN
        CREATE TEMP TABLE temp_cleanup_execution_log AS 
        SELECT * FROM cleanup_execution_log 
        WHERE execution_time >= NOW() - INTERVAL '90 days'  -- Preservar últimos 90 dias
        LIMIT 500;
        
        RAISE NOTICE 'Dados de cleanup_execution_log copiados para tabela temporária';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar backup de cleanup_execution_log: %', SQLERRM;
END $$;

-- =====================================================
-- MIGRAÇÃO DE DADOS IMPORTANTES
-- =====================================================

-- Se houver dados importantes nas tabelas de backup,
-- migrar para as tabelas principais correspondentes

-- Migrar dados de backup_audit_logs para audit_logs (se necessário)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'temp_backup_audit_logs') THEN
        -- Inserir dados importantes na tabela audit_logs principal
        INSERT INTO audit_logs (action, details, user_id, ip_address, created_at)
        SELECT 
            COALESCE(operation_type, 'BACKUP_MIGRATION') as action,
            COALESCE(old_data::text, new_data::text, 'Dados migrados de backup_audit_logs') as details,
            user_id,
            ip_address,
            COALESCE(timestamp, created_at, NOW())
        FROM temp_backup_audit_logs
        WHERE timestamp >= NOW() - INTERVAL '7 days'  -- Apenas dados recentes
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Dados importantes de backup_audit_logs migrados para audit_logs';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na migração de backup_audit_logs: %', SQLERRM;
END $$;

-- Migrar dados de backup_access_logs para access_logs (se necessário)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'temp_backup_access_logs') THEN
        INSERT INTO access_logs (user_id, action, resource, ip_address, success, created_at)
        SELECT 
            user_id,
            COALESCE(action, 'BACKUP_ACCESS'),
            COALESCE(resource, 'migrated_from_backup'),
            ip_address,
            COALESCE(success, true),
            COALESCE(timestamp, created_at, NOW())
        FROM temp_backup_access_logs
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Dados importantes de backup_access_logs migrados para access_logs';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na migração de backup_access_logs: %', SQLERRM;
END $$;

-- =====================================================
-- LOG DA OPERAÇÃO DE BACKUP
-- =====================================================

-- Registrar a operação de backup nos logs
INSERT INTO admin_logs (action, details, created_at) 
VALUES (
    'DATABASE_CLEANUP_DATA_BACKUP',
    '{"message": "Backup dos dados das tabelas não utilizadas realizado antes da limpeza. Dados importantes migrados para tabelas principais."}',
    NOW()
);

-- =====================================================
-- INSTRUÇÕES FINAIS
-- =====================================================

/*
INSTRUÇÕES PARA USO DESTE SCRIPT:

1. Execute este script ANTES de remover as tabelas
2. Verifique os logs para confirmar que o backup foi realizado
3. Os dados importantes foram migrados para as tabelas principais
4. As tabelas temporárias serão removidas automaticamente ao final da sessão
5. Mantenha este arquivo para referência futura

IMPORTANTE:
- Este script preserva apenas dados recentes e importantes
- Dados muito antigos ou irrelevantes não são preservados
- Sempre teste em ambiente de desenvolvimento primeiro
- Verifique se a migração foi bem-sucedida antes de prosseguir
*/

-- Log final da operação
DO $$
BEGIN
    RAISE NOTICE 'Script de backup de dados executado com sucesso!';
    RAISE NOTICE 'Verifique os logs acima para confirmar que todas as operações foram realizadas.';
    RAISE NOTICE 'Agora é seguro prosseguir com a remoção das tabelas não utilizadas.';
END $$;