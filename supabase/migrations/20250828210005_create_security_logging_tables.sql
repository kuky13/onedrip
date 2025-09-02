-- Criação das tabelas de log de segurança para o sistema de redirecionamento automático
-- Este arquivo implementa as tabelas access_logs e user_activity_logs conforme especificado
-- no documento técnico do sistema de redirecionamento para licenças inativas

-- =====================================================
-- TABELA: access_logs
-- Registra tentativas de acesso não autorizado
-- =====================================================

CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attempted_path TEXT NOT NULL,
    reason TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_agent TEXT,
    ip_address INET,
    session_id TEXT,
    additional_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON public.access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_reason ON public.access_logs(reason);
CREATE INDEX IF NOT EXISTS idx_access_logs_attempted_path ON public.access_logs(attempted_path);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_timestamp ON public.access_logs(user_id, timestamp DESC);

-- =====================================================
-- TABELA: user_activity_logs
-- Registra atividades gerais do usuário
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'logout', 'license_check', 'access_denied', 'redirect', 'system')),
    description TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_timestamp ON public.user_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_activity ON public.user_activity_logs(user_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_timestamp ON public.user_activity_logs(user_id, timestamp DESC);

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para access_logs
DROP TRIGGER IF EXISTS update_access_logs_updated_at ON public.access_logs;
CREATE TRIGGER update_access_logs_updated_at
    BEFORE UPDATE ON public.access_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_activity_logs
DROP TRIGGER IF EXISTS update_user_activity_logs_updated_at ON public.user_activity_logs;
CREATE TRIGGER update_user_activity_logs_updated_at
    BEFORE UPDATE ON public.user_activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER PARA CAPTURA AUTOMÁTICA DE IP
-- =====================================================

-- Função para capturar IP automaticamente
CREATE OR REPLACE FUNCTION capture_client_ip()
RETURNS TRIGGER AS $$
BEGIN
    -- Tentar capturar o IP do cliente a partir das configurações da sessão
    IF NEW.ip_address IS NULL THEN
        BEGIN
            NEW.ip_address := inet(current_setting('request.headers', true)::json->>'x-forwarded-for');
        EXCEPTION WHEN OTHERS THEN
            -- Se não conseguir capturar, manter NULL
            NEW.ip_address := NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para capturar IP em access_logs
DROP TRIGGER IF EXISTS capture_access_logs_ip ON public.access_logs;
CREATE TRIGGER capture_access_logs_ip
    BEFORE INSERT ON public.access_logs
    FOR EACH ROW
    EXECUTE FUNCTION capture_client_ip();

-- Trigger para capturar IP em user_activity_logs
DROP TRIGGER IF EXISTS capture_user_activity_logs_ip ON public.user_activity_logs;
CREATE TRIGGER capture_user_activity_logs_ip
    BEFORE INSERT ON public.user_activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION capture_client_ip();

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Política para access_logs: usuários só podem ver seus próprios logs
DROP POLICY IF EXISTS "Users can view their own access logs" ON public.access_logs;
CREATE POLICY "Users can view their own access logs"
    ON public.access_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Política para user_activity_logs: usuários só podem ver suas próprias atividades
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.user_activity_logs;
CREATE POLICY "Users can view their own activity logs"
    ON public.user_activity_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Política para inserção em access_logs: apenas sistema pode inserir
DROP POLICY IF EXISTS "System can insert access logs" ON public.access_logs;
CREATE POLICY "System can insert access logs"
    ON public.access_logs FOR INSERT
    WITH CHECK (true); -- Permitir inserção para qualquer usuário autenticado

-- Política para inserção em user_activity_logs: apenas sistema pode inserir
DROP POLICY IF EXISTS "System can insert activity logs" ON public.user_activity_logs;
CREATE POLICY "System can insert activity logs"
    ON public.user_activity_logs FOR INSERT
    WITH CHECK (true); -- Permitir inserção para qualquer usuário autenticado

-- Política para admins: acesso total aos logs
DROP POLICY IF EXISTS "Admins can view all access logs" ON public.access_logs;
CREATE POLICY "Admins can view all access logs"
    ON public.access_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.user_activity_logs;
CREATE POLICY "Admins can view all activity logs"
    ON public.user_activity_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'admin'
        )
    );

-- =====================================================
-- FUNÇÕES UTILITÁRIAS
-- =====================================================

-- Função para limpar logs antigos (manter apenas últimos 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_access_logs INTEGER;
    deleted_activity_logs INTEGER;
    total_deleted INTEGER;
BEGIN
    -- Deletar access_logs mais antigos que 90 dias
    DELETE FROM public.access_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_access_logs = ROW_COUNT;
    
    -- Deletar user_activity_logs mais antigos que 90 dias
    DELETE FROM public.user_activity_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_activity_logs = ROW_COUNT;
    
    total_deleted := deleted_access_logs + deleted_activity_logs;
    
    -- Log da limpeza
    INSERT INTO public.user_activity_logs (user_id, activity_type, description, metadata)
    VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid, -- Sistema
        'system',
        'Limpeza automática de logs de segurança',
        jsonb_build_object(
            'deleted_access_logs', deleted_access_logs,
            'deleted_activity_logs', deleted_activity_logs,
            'total_deleted', total_deleted
        )
    );
    
    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de segurança
CREATE OR REPLACE FUNCTION get_security_stats(user_id_param UUID DEFAULT NULL)
RETURNS TABLE (
    total_access_attempts INTEGER,
    failed_access_attempts INTEGER,
    license_related_failures INTEGER,
    recent_activity_count INTEGER,
    last_activity TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (
            SELECT COUNT(*)::INTEGER 
            FROM public.access_logs al 
            WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
            AND al.created_at >= NOW() - INTERVAL '24 hours'
        ) as total_access_attempts,
        (
            SELECT COUNT(*)::INTEGER 
            FROM public.access_logs al 
            WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
            AND al.created_at >= NOW() - INTERVAL '24 hours'
            AND al.reason LIKE '%license%'
        ) as failed_access_attempts,
        (
            SELECT COUNT(*)::INTEGER 
            FROM public.access_logs al 
            WHERE (user_id_param IS NULL OR al.user_id = user_id_param)
            AND al.created_at >= NOW() - INTERVAL '24 hours'
            AND al.reason IN ('license_inactive', 'license_expired', 'license_not_found')
        ) as license_related_failures,
        (
            SELECT COUNT(*)::INTEGER 
            FROM public.user_activity_logs ual 
            WHERE (user_id_param IS NULL OR ual.user_id = user_id_param)
            AND ual.created_at >= NOW() - INTERVAL '24 hours'
        ) as recent_activity_count,
        (
            SELECT MAX(ual.timestamp) 
            FROM public.user_activity_logs ual 
            WHERE (user_id_param IS NULL OR ual.user_id = user_id_param)
        ) as last_activity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.access_logs IS 'Registra tentativas de acesso não autorizado ao sistema';
COMMENT ON TABLE public.user_activity_logs IS 'Registra atividades gerais dos usuários no sistema';

COMMENT ON COLUMN public.access_logs.user_id IS 'ID do usuário que tentou o acesso';
COMMENT ON COLUMN public.access_logs.attempted_path IS 'Caminho/rota que o usuário tentou acessar';
COMMENT ON COLUMN public.access_logs.reason IS 'Motivo da negação de acesso (ex: license_inactive, license_expired)';
COMMENT ON COLUMN public.access_logs.additional_data IS 'Dados adicionais em formato JSON';

COMMENT ON COLUMN public.user_activity_logs.activity_type IS 'Tipo de atividade: login, logout, license_check, access_denied, redirect';
COMMENT ON COLUMN public.user_activity_logs.description IS 'Descrição detalhada da atividade';
COMMENT ON COLUMN public.user_activity_logs.metadata IS 'Metadados da atividade em formato JSON';

-- =====================================================
-- GRANTS DE PERMISSÃO
-- =====================================================

-- Conceder permissões básicas para roles autenticados
GRANT SELECT, INSERT ON public.access_logs TO authenticated;
GRANT SELECT, INSERT ON public.user_activity_logs TO authenticated;

-- Conceder permissões para role anônimo (apenas inserção para logs de sistema)
GRANT INSERT ON public.access_logs TO anon;
GRANT INSERT ON public.user_activity_logs TO anon;

-- Conceder permissões para service_role (acesso total)
GRANT ALL ON public.access_logs TO service_role;
GRANT ALL ON public.user_activity_logs TO service_role;

-- Conceder permissões para execução das funções
GRANT EXECUTE ON FUNCTION cleanup_old_security_logs() TO service_role;
GRANT EXECUTE ON FUNCTION get_security_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_stats(UUID) TO service_role;

-- =====================================================
-- DADOS INICIAIS (OPCIONAL)
-- =====================================================

-- Tabelas de log criadas com sucesso
-- Os dados serão inseridos automaticamente pelo sistema quando necessário

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se as tabelas foram criadas corretamente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_logs') THEN
        RAISE EXCEPTION 'Falha ao criar tabela access_logs';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity_logs') THEN
        RAISE EXCEPTION 'Falha ao criar tabela user_activity_logs';
    END IF;
    
    RAISE NOTICE 'Tabelas de log de segurança criadas com sucesso!';
END $$;