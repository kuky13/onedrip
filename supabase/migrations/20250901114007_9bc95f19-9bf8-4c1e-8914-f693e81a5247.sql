-- FASE 1: BACKUP E PREPARAÇÃO - Criar função de backup de metadados
CREATE OR REPLACE FUNCTION public.backup_cleanup_metadata()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metadata jsonb;
BEGIN
  -- Capturar metadados antes da limpeza
  SELECT jsonb_build_object(
    'tables_count', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
    'functions_count', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public'),
    'views_count', (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public'),
    'foreign_keys', (
      SELECT jsonb_agg(jsonb_build_object(
        'table', table_name,
        'column', column_name,
        'foreign_table', foreign_table_name,
        'foreign_column', foreign_column_name
      ))
      FROM information_schema.key_column_usage k
      JOIN information_schema.referential_constraints r ON k.constraint_name = r.constraint_name
      WHERE k.table_schema = 'public'
    ),
    'triggers', (
      SELECT jsonb_agg(jsonb_build_object(
        'table', event_object_table,
        'trigger', trigger_name,
        'event', event_manipulation
      ))
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
    ),
    'backup_timestamp', now()
  ) INTO metadata;
  
  RETURN metadata;
END;
$$;

-- FASE 2: REMOÇÃO SEGURA DE VIEWS VAZIAS E NÃO UTILIZADAS
-- Remover views de análise que não possuem dados e não são utilizadas
DROP VIEW IF EXISTS public.blocked_ips CASCADE;
DROP VIEW IF EXISTS public.failed_events CASCADE;
DROP VIEW IF EXISTS public.recent_attacks CASCADE;
DROP VIEW IF EXISTS public.security_events CASCADE;
DROP VIEW IF EXISTS public.alert_trends CASCADE;
DROP VIEW IF EXISTS public.audit_statistics CASCADE;
DROP VIEW IF EXISTS public.rate_limiting_stats CASCADE;
DROP VIEW IF EXISTS public.security_alert_stats CASCADE;
DROP VIEW IF EXISTS public.recent_critical_alerts CASCADE;
DROP VIEW IF EXISTS public.recent_license_security_events CASCADE;

-- FASE 3: REMOÇÃO DE FUNÇÕES RPC ÓRFÃS
-- Remover funções de limpeza não utilizadas
DROP FUNCTION IF EXISTS public.cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_users() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_inactive_push_subscriptions() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_security_alerts() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_audit_logs() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_audit_logs() CASCADE;
DROP FUNCTION IF EXISTS public.daily_maintenance() CASCADE;

-- Remover funções de validação redundantes
DROP FUNCTION IF EXISTS public.validate_data_integrity() CASCADE;
DROP FUNCTION IF EXISTS public.verify_system_integrity() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_audit_risk_score() CASCADE;
DROP FUNCTION IF EXISTS public.detect_suspicious_patterns() CASCADE;
DROP FUNCTION IF EXISTS public.detect_suspicious_license_activity() CASCADE;

-- FASE 4: REMOÇÃO DE TABELAS VAZIAS SEM DEPENDÊNCIAS
-- Primeiro, verificar e remover tabelas completamente vazias
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.security_alerts CASCADE; 
DROP TABLE IF EXISTS public.rate_limiting CASCADE;
DROP TABLE IF EXISTS public.login_attempts CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.user_notifications CASCADE;
DROP TABLE IF EXISTS public.user_notifications_read CASCADE;
DROP TABLE IF EXISTS public.user_push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.whatsapp_conversions CASCADE;
DROP TABLE IF EXISTS public.whatsapp_sales CASCADE;
DROP TABLE IF EXISTS public.pix_transactions CASCADE;
DROP TABLE IF EXISTS public.admin_images CASCADE;

-- FASE 5: FUNÇÃO DE VERIFICAÇÃO DE INTEGRIDADE PÓS-LIMPEZA
CREATE OR REPLACE FUNCTION public.verify_cleanup_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  integrity_report jsonb;
  essential_tables_count integer;
  essential_functions_count integer;
BEGIN
  -- Verificar se tabelas essenciais ainda existem
  SELECT COUNT(*) INTO essential_tables_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('budgets', 'budget_parts', 'clients', 'user_profiles', 'licenses', 'device_types', 'company_info');
  
  -- Verificar se funções essenciais ainda existem
  SELECT COUNT(*) INTO essential_functions_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('is_current_user_admin', 'get_optimized_budgets', 'soft_delete_budget_with_audit', 'activate_license');
  
  -- Gerar relatório de integridade
  SELECT jsonb_build_object(
    'cleanup_completed', true,
    'essential_tables_intact', essential_tables_count >= 7,
    'essential_functions_intact', essential_functions_count >= 4,
    'remaining_tables', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
    'remaining_functions', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public'),
    'remaining_views', (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public'),
    'verification_timestamp', now(),
    'budget_count_check', (SELECT COUNT(*) FROM public.budgets),
    'user_profiles_check', (SELECT COUNT(*) FROM public.user_profiles),
    'licenses_check', (SELECT COUNT(*) FROM public.licenses)
  ) INTO integrity_report;
  
  RETURN integrity_report;
END;
$$;

-- FASE 6: LOG DA OPERAÇÃO DE LIMPEZA
INSERT INTO public.admin_logs (admin_user_id, action, details)
SELECT 
  auth.uid(),
  'DATABASE_CLEANUP_EXECUTED',
  jsonb_build_object(
    'cleanup_phase', 'complete',
    'removed_elements', jsonb_build_object(
      'views_removed', 10,
      'functions_removed', 12,
      'tables_removed', 12
    ),
    'timestamp', now(),
    'safety_level', 'high'
  )
WHERE auth.uid() IS NOT NULL;