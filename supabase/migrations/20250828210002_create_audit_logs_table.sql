-- Create comprehensive audit logs table for security monitoring
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    event_details JSONB,
    severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id TEXT,
    resource_type TEXT,
    resource_id TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    
    -- Additional metadata
    request_id TEXT,
    correlation_id TEXT,
    source_system TEXT DEFAULT 'web_app',
    environment TEXT DEFAULT 'production',
    
    -- Geolocation data (optional)
    country_code TEXT,
    region TEXT,
    city TEXT,
    
    -- Performance metrics
    response_time_ms INTEGER,
    
    -- Risk assessment
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    
    -- Retention metadata
    retention_until TIMESTAMPTZ,
    archived BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_score ON audit_logs(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_archived ON audit_logs(archived) WHERE NOT archived;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_event_time ON audit_logs(user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity_time ON audit_logs(severity, created_at DESC) WHERE severity IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_audit_logs_failed_events ON audit_logs(event_type, created_at DESC) WHERE NOT success;

-- GIN index for JSONB event_details
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_details_gin ON audit_logs USING GIN(event_details);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admin users can see all audit logs
CREATE POLICY "Admin full access to audit logs" ON audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Users can only see their own audit logs (limited events)
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (
        user_id = auth.uid() 
        AND event_type IN (
            'license_validation',
            'license_activation', 
            'license_deactivation',
            'profile_update',
            'user_login',
            'user_logout'
        )
    );

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Service role can update audit logs (for archiving)
CREATE POLICY "Service role can update audit logs" ON audit_logs
    FOR UPDATE USING (true);

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT ALL PRIVILEGES ON audit_logs TO service_role;

-- Create audit statistics view
CREATE OR REPLACE VIEW audit_statistics AS
SELECT 
    event_type,
    severity,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE success) as successful_events,
    COUNT(*) FILTER (WHERE NOT success) as failed_events,
    ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
    ROUND(AVG(risk_score), 2) as avg_risk_score,
    MIN(created_at) as first_event,
    MAX(created_at) as last_event,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY total_events DESC;

-- Create security events view (high-risk events)
CREATE OR REPLACE VIEW security_events AS
SELECT 
    al.id,
    al.event_type,
    al.user_id,
    al.ip_address,
    al.user_agent,
    al.event_details,
    al.severity,
    al.created_at,
    al.success,
    al.error_message,
    al.risk_score,
    -- Join user information
    COALESCE(up.name, 'unknown') as user_name,
    COALESCE(up.username, 'unknown') as username
FROM audit_logs al
LEFT JOIN user_profiles up ON al.user_id = up.id
WHERE 
    al.severity IN ('high', 'critical')
    OR al.risk_score >= 70
    OR al.event_type IN (
        'security_violation',
        'rate_limit_exceeded', 
        'suspicious_activity',
        'admin_action'
    )
ORDER BY al.created_at DESC;

-- Create failed events view
CREATE OR REPLACE VIEW failed_events AS
SELECT 
    al.id,
    al.event_type,
    al.user_id,
    al.ip_address,
    al.event_details,
    al.error_message,
    al.created_at,
    al.risk_score,
    COALESCE(up.name, 'unknown') as user_name
FROM audit_logs al
LEFT JOIN user_profiles up ON al.user_id = up.id
WHERE NOT al.success
ORDER BY al.created_at DESC;

-- Grant view permissions
GRANT SELECT ON audit_statistics TO authenticated;
GRANT SELECT ON security_events TO authenticated;
GRANT SELECT ON failed_events TO authenticated;

-- Create function to automatically set retention date
CREATE OR REPLACE FUNCTION set_audit_retention()
RETURNS TRIGGER AS $$
BEGIN
    -- Set retention based on event type and severity
    IF NEW.severity = 'critical' OR NEW.event_type IN ('admin_action', 'security_violation') THEN
        NEW.retention_until := NEW.created_at + INTERVAL '7 years';
    ELSIF NEW.severity = 'high' OR NEW.event_type IN ('suspicious_activity', 'rate_limit_exceeded') THEN
        NEW.retention_until := NEW.created_at + INTERVAL '2 years';
    ELSE
        NEW.retention_until := NEW.created_at + INTERVAL '1 year';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for retention
CREATE TRIGGER audit_retention_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_retention();

-- Create function to calculate risk score
CREATE OR REPLACE FUNCTION calculate_audit_risk_score(
    p_event_type TEXT,
    p_user_id UUID,
    p_ip_address INET,
    p_success BOOLEAN,
    p_event_details JSONB
)
RETURNS INTEGER AS $$
DECLARE
    risk_score INTEGER := 0;
    recent_failures INTEGER;
    ip_event_count INTEGER;
    user_event_count INTEGER;
BEGIN
    -- Base risk by event type
    CASE p_event_type
        WHEN 'security_violation' THEN risk_score := 90;
        WHEN 'admin_action' THEN risk_score := 70;
        WHEN 'suspicious_activity' THEN risk_score := 80;
        WHEN 'rate_limit_exceeded' THEN risk_score := 60;
        WHEN 'password_reset' THEN risk_score := 30;
        WHEN 'user_login' THEN risk_score := 10;
        ELSE risk_score := 5;
    END CASE;
    
    -- Increase risk for failures
    IF NOT p_success THEN
        risk_score := risk_score + 20;
    END IF;
    
    -- Check for recent failures from same user
    IF p_user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO recent_failures
        FROM audit_logs
        WHERE user_id = p_user_id
        AND NOT success
        AND created_at >= NOW() - INTERVAL '1 hour';
        
        risk_score := risk_score + (recent_failures * 10);
    END IF;
    
    -- Check for high activity from same IP
    IF p_ip_address IS NOT NULL THEN
        SELECT COUNT(*) INTO ip_event_count
        FROM audit_logs
        WHERE ip_address = p_ip_address
        AND created_at >= NOW() - INTERVAL '1 hour';
        
        IF ip_event_count > 100 THEN
            risk_score := risk_score + 30;
        ELSIF ip_event_count > 50 THEN
            risk_score := risk_score + 15;
        END IF;
    END IF;
    
    -- Cap at 100
    RETURN LEAST(risk_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Archive old logs instead of deleting
    UPDATE audit_logs 
    SET archived = true
    WHERE retention_until < NOW()
    AND NOT archived;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Actually delete very old archived logs (older than 10 years)
    DELETE FROM audit_logs
    WHERE archived = true
    AND created_at < NOW() - INTERVAL '10 years';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get audit summary for a user
CREATE OR REPLACE FUNCTION get_user_audit_summary(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    event_type TEXT,
    total_events BIGINT,
    successful_events BIGINT,
    failed_events BIGINT,
    last_event TIMESTAMPTZ,
    avg_risk_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.event_type,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE al.success) as successful_events,
        COUNT(*) FILTER (WHERE NOT al.success) as failed_events,
        MAX(al.created_at) as last_event,
        ROUND(AVG(al.risk_score), 2) as avg_risk_score
    FROM audit_logs al
    WHERE al.user_id = p_user_id
    AND al.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY al.event_type
    ORDER BY total_events DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to detect suspicious patterns
CREATE OR REPLACE FUNCTION detect_suspicious_patterns()
RETURNS TABLE (
    pattern_type TEXT,
    description TEXT,
    severity TEXT,
    count BIGINT,
    details JSONB
) AS $$
BEGIN
    -- Multiple failed logins from same IP
    RETURN QUERY
    SELECT 
        'multiple_failed_logins'::TEXT,
        'Multiple failed login attempts from same IP'::TEXT,
        'high'::TEXT,
        COUNT(*),
        jsonb_build_object(
            'ip_address', ip_address,
            'time_window', '1 hour',
            'threshold', 5
        )
    FROM audit_logs
    WHERE event_type = 'user_login'
    AND NOT success
    AND created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY ip_address
    HAVING COUNT(*) >= 5;
    
    -- Rapid license activations
    RETURN QUERY
    SELECT 
        'rapid_license_activations'::TEXT,
        'Rapid license activations from same user'::TEXT,
        'medium'::TEXT,
        COUNT(*),
        jsonb_build_object(
            'user_id', user_id,
            'time_window', '10 minutes',
            'threshold', 3
        )
    FROM audit_logs
    WHERE event_type = 'license_activation'
    AND success
    AND created_at >= NOW() - INTERVAL '10 minutes'
    GROUP BY user_id
    HAVING COUNT(*) >= 3;
    
    -- High risk score events
    RETURN QUERY
    SELECT 
        'high_risk_events'::TEXT,
        'Events with high risk scores'::TEXT,
        'critical'::TEXT,
        COUNT(*),
        jsonb_build_object(
            'time_window', '1 hour',
            'min_risk_score', 80
        )
    FROM audit_logs
    WHERE risk_score >= 80
    AND created_at >= NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log table for security monitoring and compliance';
COMMENT ON COLUMN audit_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event being audited';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the client';
COMMENT ON COLUMN audit_logs.event_details IS 'Detailed information about the event in JSON format';
COMMENT ON COLUMN audit_logs.severity IS 'Severity level of the event (low, medium, high, critical)';
COMMENT ON COLUMN audit_logs.risk_score IS 'Calculated risk score for the event (0-100)';
COMMENT ON COLUMN audit_logs.retention_until IS 'Date until which this log should be retained';
COMMENT ON COLUMN audit_logs.archived IS 'Whether this log has been archived';

COMMENT ON FUNCTION calculate_audit_risk_score IS 'Calculates risk score for audit events based on various factors';
COMMENT ON FUNCTION cleanup_audit_logs IS 'Archives old audit logs based on retention policy';
COMMENT ON FUNCTION get_user_audit_summary IS 'Gets audit summary for a specific user';
COMMENT ON FUNCTION detect_suspicious_patterns IS 'Detects suspicious activity patterns in audit logs';