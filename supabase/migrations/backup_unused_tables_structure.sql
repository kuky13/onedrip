-- =====================================================
-- BACKUP DAS ESTRUTURAS DE TABELAS NÃO UTILIZADAS
-- Data: $(date)
-- Propósito: Backup antes da limpeza do banco de dados
-- =====================================================

-- Este arquivo contém o backup das estruturas das tabelas
-- identificadas como não utilizadas na análise do banco de dados

-- =====================================================
-- TABELA: backup_audit_logs
-- =====================================================
/*
CREATE TABLE IF NOT EXISTS backup_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_table_name TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

-- =====================================================
-- TABELA: backup_access_logs
-- =====================================================
/*
CREATE TABLE IF NOT EXISTS backup_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    resource TEXT,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

-- =====================================================
-- TABELA: backup_user_activity_logs
-- =====================================================
/*
CREATE TABLE IF NOT EXISTS backup_user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

-- =====================================================
-- TABELA: cleanup_execution_log
-- =====================================================
/*
CREATE TABLE IF NOT EXISTS cleanup_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cleanup_type TEXT NOT NULL,
    execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    records_affected INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Backup das políticas RLS das tabelas (se existirem)
-- Estas políticas serão perdidas quando as tabelas forem removidas

/*
-- Políticas para backup_audit_logs
ALTER TABLE backup_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para backup_access_logs  
ALTER TABLE backup_access_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para backup_user_activity_logs
ALTER TABLE backup_user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para cleanup_execution_log
ALTER TABLE cleanup_execution_log ENABLE ROW LEVEL SECURITY;
*/

-- =====================================================
-- ÍNDICES
-- =====================================================

/*
-- Índices das tabelas de backup (se existirem)
CREATE INDEX IF NOT EXISTS idx_backup_audit_logs_timestamp ON backup_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_backup_audit_logs_user_id ON backup_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_backup_access_logs_timestamp ON backup_access_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_backup_access_logs_user_id ON backup_access_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_backup_user_activity_logs_timestamp ON backup_user_activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_backup_user_activity_logs_user_id ON backup_user_activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_cleanup_execution_log_execution_time ON cleanup_execution_log(execution_time);
CREATE INDEX IF NOT EXISTS idx_cleanup_execution_log_cleanup_type ON cleanup_execution_log(cleanup_type);
*/

-- =====================================================
-- TRIGGERS
-- =====================================================

/*
-- Triggers das tabelas de backup (se existirem)
-- Exemplo de trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
*/

-- =====================================================
-- COMENTÁRIOS E METADADOS
-- =====================================================

/*
COMMENT ON TABLE backup_audit_logs IS 'Backup de logs de auditoria - Tabela identificada como não utilizada';
COMMENT ON TABLE backup_access_logs IS 'Backup de logs de acesso - Tabela identificada como não utilizada';
COMMENT ON TABLE backup_user_activity_logs IS 'Backup de logs de atividade - Tabela identificada como não utilizada';
COMMENT ON TABLE cleanup_execution_log IS 'Log de execução de limpeza - Tabela identificada como não utilizada';
*/

-- =====================================================
-- INSTRUÇÕES PARA RESTAURAÇÃO
-- =====================================================

/*
PARA RESTAURAR AS TABELAS:
1. Descomente as seções CREATE TABLE acima
2. Execute este arquivo no Supabase
3. Restaure os dados a partir do backup de dados (se necessário)
4. Reconfigure as políticas RLS conforme necessário
5. Verifique se todas as dependências estão funcionando

IMPORTANTE:
- Este backup contém apenas as estruturas das tabelas
- Os dados devem ser exportados separadamente antes da remoção
- Sempre teste a restauração em ambiente de desenvolvimento primeiro
*/

-- =====================================================
-- LOG DE BACKUP
-- =====================================================

-- Registrar que o backup foi criado
INSERT INTO admin_logs (action, details, created_at) 
VALUES (
    'DATABASE_CLEANUP_BACKUP_CREATED',
    'Backup das estruturas de tabelas não utilizadas criado antes da limpeza do banco de dados',
    NOW()
) ON CONFLICT DO NOTHING;

-- Fim do arquivo de backup