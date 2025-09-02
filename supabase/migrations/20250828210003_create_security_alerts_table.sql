-- Create security alerts table for real-time monitoring
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Source information
    source_system VARCHAR(50) DEFAULT 'license_system',
    source_function VARCHAR(100),
    
    -- Event details
    event_data JSONB DEFAULT '{}',
    affected_entities JSONB DEFAULT '{}', -- users, IPs, licenses affected
    
    -- Risk assessment
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    confidence_level DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0),
    
    -- Status and resolution
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    
    -- Notification tracking
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_channels JSONB DEFAULT '[]', -- email, webhook, sms, etc.
    notification_attempts INTEGER DEFAULT 0,
    last_notification_at TIMESTAMP WITH TIME ZONE,
    
    -- Correlation and grouping
    correlation_id VARCHAR(100), -- to group related alerts
    parent_alert_id UUID REFERENCES security_alerts(id),
    alert_group VARCHAR(100), -- for grouping similar alerts
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- for auto-cleanup
    
    -- Escalation
    escalation_level INTEGER DEFAULT 0,
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalated_to UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_security_alerts_status ON security_alerts(status);
CREATE INDEX idx_security_alerts_created_at ON security_alerts(created_at);
CREATE INDEX idx_security_alerts_risk_score ON security_alerts(risk_score);
CREATE INDEX idx_security_alerts_correlation_id ON security_alerts(correlation_id);
CREATE INDEX idx_security_alerts_alert_group ON security_alerts(alert_group);
CREATE INDEX idx_security_alerts_expires_at ON security_alerts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_security_alerts_notification_sent ON security_alerts(notification_sent) WHERE notification_sent = FALSE;

-- GIN index for JSONB columns
CREATE INDEX idx_security_alerts_event_data ON security_alerts USING GIN(event_data);
CREATE INDEX idx_security_alerts_affected_entities ON security_alerts USING GIN(affected_entities);
CREATE INDEX idx_security_alerts_metadata ON security_alerts USING GIN(metadata);

-- Enable Row Level Security
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can see all alerts
CREATE POLICY "Admins can view all security alerts" ON security_alerts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Admins can manage all alerts
CREATE POLICY "Admins can manage security alerts" ON security_alerts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Service role can do everything
CREATE POLICY "Service role can manage security alerts" ON security_alerts
    FOR ALL
    USING (auth.role() = 'service_role');

-- Users can see alerts that affect them (low/medium severity only)
CREATE POLICY "Users can view their related alerts" ON security_alerts
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND severity IN ('low', 'medium')
        AND (
            affected_entities ? auth.uid()::text
            OR affected_entities->'users' ? auth.uid()::text
        )
    );

-- Create alert statistics view
CREATE OR REPLACE VIEW security_alert_stats AS
SELECT 
    COUNT(*) as total_alerts,
    COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
    COUNT(*) FILTER (WHERE severity = 'high') as high_alerts,
    COUNT(*) FILTER (WHERE severity = 'medium') as medium_alerts,
    COUNT(*) FILTER (WHERE severity = 'low') as low_alerts,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as alerts_last_24h,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as alerts_last_hour,
    AVG(risk_score) as avg_risk_score,
    MAX(risk_score) as max_risk_score,
    COUNT(DISTINCT alert_type) as unique_alert_types,
    COUNT(*) FILTER (WHERE notification_sent = FALSE AND status = 'active') as pending_notifications
FROM security_alerts
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Create recent critical alerts view
CREATE OR REPLACE VIEW recent_critical_alerts AS
SELECT 
    id,
    alert_type,
    severity,
    title,
    description,
    risk_score,
    status,
    affected_entities,
    created_at,
    correlation_id
FROM security_alerts
WHERE severity IN ('critical', 'high')
    AND status = 'active'
    AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY risk_score DESC, created_at DESC
LIMIT 50;

-- Create alert trends view
CREATE OR REPLACE VIEW alert_trends AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    alert_type,
    severity,
    COUNT(*) as alert_count,
    AVG(risk_score) as avg_risk_score
FROM security_alerts
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), alert_type, severity
ORDER BY hour DESC;

-- Function to auto-resolve expired alerts
CREATE OR REPLACE FUNCTION auto_resolve_expired_alerts()
RETURNS INTEGER AS $$
DECLARE
    resolved_count INTEGER;
BEGIN
    UPDATE security_alerts
    SET 
        status = 'resolved',
        resolved_at = NOW(),
        resolution_notes = 'Auto-resolved: Alert expired'
    WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at < NOW();
    
    GET DIAGNOSTICS resolved_count = ROW_COUNT;
    
    RETURN resolved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old resolved alerts
CREATE OR REPLACE FUNCTION cleanup_old_security_alerts(
    retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM security_alerts
    WHERE status IN ('resolved', 'false_positive')
        AND resolved_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to escalate high-risk unresolved alerts
CREATE OR REPLACE FUNCTION escalate_unresolved_alerts(
    escalation_threshold_hours INTEGER DEFAULT 2,
    risk_threshold INTEGER DEFAULT 70
)
RETURNS INTEGER AS $$
DECLARE
    escalated_count INTEGER;
BEGIN
    UPDATE security_alerts
    SET 
        escalation_level = escalation_level + 1,
        escalated_at = NOW(),
        updated_at = NOW()
    WHERE status = 'active'
        AND risk_score >= risk_threshold
        AND created_at < NOW() - (escalation_threshold_hours || ' hours')::INTERVAL
        AND (escalated_at IS NULL OR escalated_at < NOW() - INTERVAL '4 hours');
    
    GET DIAGNOSTICS escalated_count = ROW_COUNT;
    
    RETURN escalated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get alert summary for dashboard
CREATE OR REPLACE FUNCTION get_security_dashboard_summary()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'timestamp', NOW(),
        'active_alerts', (
            SELECT COUNT(*) FROM security_alerts WHERE status = 'active'
        ),
        'critical_alerts', (
            SELECT COUNT(*) FROM security_alerts 
            WHERE status = 'active' AND severity = 'critical'
        ),
        'high_risk_alerts', (
            SELECT COUNT(*) FROM security_alerts 
            WHERE status = 'active' AND risk_score >= 80
        ),
        'alerts_last_hour', (
            SELECT COUNT(*) FROM security_alerts 
            WHERE created_at >= NOW() - INTERVAL '1 hour'
        ),
        'pending_notifications', (
            SELECT COUNT(*) FROM security_alerts 
            WHERE notification_sent = FALSE AND status = 'active'
        ),
        'top_alert_types', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'type', alert_type,
                    'count', alert_count
                )
            )
            FROM (
                SELECT alert_type, COUNT(*) as alert_count
                FROM security_alerts
                WHERE status = 'active'
                GROUP BY alert_type
                ORDER BY COUNT(*) DESC
                LIMIT 5
            ) top_types
        ),
        'recent_escalations', (
            SELECT COUNT(*) FROM security_alerts 
            WHERE escalated_at >= NOW() - INTERVAL '24 hours'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to correlate related alerts
CREATE OR REPLACE FUNCTION correlate_security_alerts(
    alert_id UUID
)
RETURNS SETOF security_alerts AS $$
DECLARE
    target_alert security_alerts%ROWTYPE;
BEGIN
    -- Get the target alert
    SELECT * INTO target_alert FROM security_alerts WHERE id = alert_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Find related alerts based on various criteria
    RETURN QUERY
    SELECT sa.*
    FROM security_alerts sa
    WHERE sa.id != alert_id
        AND sa.created_at >= target_alert.created_at - INTERVAL '1 hour'
        AND sa.created_at <= target_alert.created_at + INTERVAL '1 hour'
        AND (
            -- Same correlation ID
            (sa.correlation_id IS NOT NULL AND sa.correlation_id = target_alert.correlation_id)
            OR
            -- Same alert type and similar risk score
            (sa.alert_type = target_alert.alert_type AND ABS(sa.risk_score - target_alert.risk_score) <= 10)
            OR
            -- Overlapping affected entities
            (sa.affected_entities ?| ARRAY(SELECT jsonb_object_keys(target_alert.affected_entities)))
        )
    ORDER BY sa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_security_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_security_alerts_updated_at
    BEFORE UPDATE ON security_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_security_alerts_updated_at();

-- Grant permissions
GRANT SELECT ON security_alerts TO anon;
GRANT ALL PRIVILEGES ON security_alerts TO authenticated;
GRANT ALL PRIVILEGES ON security_alerts TO service_role;

-- Grant permissions on views
GRANT SELECT ON security_alert_stats TO authenticated;
GRANT SELECT ON recent_critical_alerts TO authenticated;
GRANT SELECT ON alert_trends TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION auto_resolve_expired_alerts() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_security_alerts(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION escalate_unresolved_alerts(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_security_dashboard_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION correlate_security_alerts(UUID) TO authenticated;

-- Add comments
COMMENT ON TABLE security_alerts IS 'Security alerts and incidents for real-time monitoring';
COMMENT ON COLUMN security_alerts.alert_type IS 'Type of security alert (e.g., suspicious_login, rate_limit_exceeded, license_violation)';
COMMENT ON COLUMN security_alerts.severity IS 'Alert severity level';
COMMENT ON COLUMN security_alerts.risk_score IS 'Risk score from 0-100';
COMMENT ON COLUMN security_alerts.confidence_level IS 'Confidence level of the alert (0.0-1.0)';
COMMENT ON COLUMN security_alerts.affected_entities IS 'JSON object containing affected users, IPs, licenses, etc.';
COMMENT ON COLUMN security_alerts.correlation_id IS 'ID to group related alerts together';
COMMENT ON COLUMN security_alerts.notification_channels IS 'Array of notification channels used';
COMMENT ON COLUMN security_alerts.escalation_level IS 'Number of times this alert has been escalated';