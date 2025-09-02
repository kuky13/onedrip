# Análise de Limpeza do Banco de Dados Supabase

## Resumo da Análise

Esta análise identificou **29 tabelas** e **mais de 100 funções** no banco de dados. Após examinar o código fonte da aplicação, identifiquei quais elementos estão sendo utilizados e quais podem ser removidos com segurança.

## Tabelas Utilizadas (MANTER)

### Core do Sistema
- `budgets` - Sistema principal de orçamentos
- `budget_parts` - Partes dos orçamentos
- `budget_deletion_audit` - Auditoria de exclusões
- `clients` - Clientes do sistema
- `user_profiles` - Perfis de usuários
- `shop_profiles` - Perfis de lojas
- `device_types` - Tipos de dispositivos
- `warranty_periods` - Períodos de garantia
- `site_settings` - Configurações do site

### Sistema de Licenças
- `licenses` - Licenças do sistema
- `license_history` - Histórico de licenças
- `user_license_analytics` - Analytics de licenças
- `user_license_bulk_operations` - Operações em lote
- `license_validation_audit` - Auditoria de validações

### Ordens de Serviço
- `service_orders` - Ordens de serviço
- `service_order_items` - Itens das ordens
- `service_order_events` - Eventos das ordens
- `service_order_attachments` - Anexos das ordens
- `service_order_shares` - Compartilhamentos

### Sistema de Notificações
- `notifications` - Notificações do sistema
- `user_notifications` - Notificações dos usuários
- `user_notifications_read` - Status de leitura
- `user_push_subscriptions` - Assinaturas push

### Segurança e Auditoria
- `admin_logs` - Logs administrativos
- `access_logs` - Logs de acesso
- `user_activity_logs` - Logs de atividade
- `audit_logs` - Logs de auditoria
- `security_alerts` - Alertas de segurança
- `rate_limiting` - Limitação de taxa
- `spam_patterns` - Padrões de spam
- `login_attempts` - Tentativas de login
- `rate_limit_tracking` - Rastreamento de limites
- `user_activity_metrics` - Métricas de atividade
- `persistent_sessions` - Sessões persistentes

### Outros Sistemas
- `company_info` - Informações da empresa
- `company_share_settings` - Configurações de compartilhamento
- `admin_images` - Imagens administrativas
- `ranking_invaders` - Sistema de ranking
- `game_settings` - Configurações de jogos
- `pix_transactions` - Transações PIX
- `whatsapp_conversions` - Conversões WhatsApp
- `whatsapp_sales` - Vendas WhatsApp

## Tabelas Potencialmente Não Utilizadas (INVESTIGAR)

### Tabelas de Backup
- `backup_audit_logs` - Backup de logs de auditoria
- `backup_access_logs` - Backup de logs de acesso
- `backup_user_activity_logs` - Backup de logs de atividade
- `cleanup_execution_log` - Log de execução de limpeza

**Recomendação**: Estas tabelas parecem ser backups ou logs de manutenção. Verificar se há processos automáticos que as utilizam antes de remover.

## Funções RPC Utilizadas (MANTER)

### Autenticação e Usuários
- `debug_current_user`
- `admin_get_users_with_license_details`
- `admin_get_all_users`
- `is_current_user_admin`
- `get_user_role`
- `admin_update_user`
- `admin_delete_user`
- `admin_renew_user_license`

### Licenças
- `activate_license`
- `activate_license_enhanced`
- `admin_get_licenses_with_users`
- `admin_create_license`
- `admin_create_bulk_licenses`
- `admin_renew_license`
- `admin_get_license_stats`
- `admin_get_license_history`
- `admin_get_user_license_analytics`
- `admin_bulk_license_operation`

### Orçamentos
- `get_optimized_budgets`
- `soft_delete_budget_with_audit`
- `restore_deleted_budget`
- `soft_delete_all_user_budgets`

### Ordens de Serviço
- `get_deleted_service_orders`
- `restore_service_order`
- `hard_delete_service_order`
- `empty_service_orders_trash`
- `get_service_order_by_share_token`
- `get_company_info_by_share_token`
- `generate_service_order_share_token`

### Notificações
- `get_user_notifications`
- `mark_notification_as_read`
- `delete_user_notification`
- `admin_create_notification`
- `admin_list_notifications`
- `admin_list_user_notifications`
- `send_push_notification`

### Segurança
- `log_security_event`
- `audit_rls_policies`
- `cleanup_old_logs`
- `manage_persistent_session`
- `trust_device`

### Métricas e Analytics
- `admin_get_user_metrics`
- `admin_get_enhanced_users`

## Funções Potencialmente Não Utilizadas

### Funções de Manutenção
- `cleanup_expired_sessions`
- `cleanup_old_deleted_budgets`
- `cleanup_expired_users`
- `daily_maintenance`
- `cleanup_inactive_push_subscriptions`
- `cleanup_old_security_alerts`
- `cleanup_audit_logs`
- `cleanup_old_audit_logs`

**Recomendação**: Verificar se estas funções são chamadas por jobs automáticos ou cron jobs antes de remover.

### Funções de Validação e Utilitários
- `validate_data_integrity`
- `verify_system_integrity`
- `validate_input`
- `detect_sql_injection`
- `calculate_audit_risk_score`
- `detect_suspicious_patterns`
- `detect_suspicious_license_activity`

**Recomendação**: Estas funções podem ser utilizadas internamente pelo sistema. Manter por segurança.

## Plano de Limpeza Segura

### Fase 1: Backup Completo
1. Criar backup completo do esquema
2. Exportar dados das tabelas de backup
3. Documentar todas as dependências

### Fase 2: Remoção das Tabelas de Backup
1. `backup_audit_logs`
2. `backup_access_logs`
3. `backup_user_activity_logs`
4. `cleanup_execution_log`

### Fase 3: Limpeza de Funções de Manutenção Não Utilizadas
- Verificar jobs automáticos
- Remover funções confirmadamente não utilizadas

### Fase 4: Verificação de Integridade
1. Testar todas as funcionalidades principais
2. Verificar logs de erro
3. Confirmar que não há referências quebradas

## Estimativa de Economia

- **Tabelas a remover**: 4 tabelas de backup
- **Funções a investigar**: ~15 funções de manutenção
- **Economia estimada**: 10-15% do tamanho do banco
- **Melhoria de performance**: Redução de overhead em consultas

## Riscos e Precauções

⚠️ **ATENÇÃO**: 
- Sempre fazer backup completo antes de qualquer remoção
- Testar em ambiente de desenvolvimento primeiro
- Verificar jobs automáticos e cron jobs
- Monitorar logs após a limpeza
- Ter plano de rollback preparado

## Próximos Passos

1. ✅ Análise completa realizada
2. 🔄 Criar backup das estruturas
3. ⏳ Executar limpeza das tabelas de backup
4. ⏳ Verificar integridade do sistema
5. ⏳ Documentar resultados finais