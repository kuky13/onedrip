-- Update existing license_validation_audit table for Phase 3 security requirements

-- Add missing columns
ALTER TABLE license_validation_audit 
ADD COLUMN IF NOT EXISTS event_type TEXT,
ADD COLUMN IF NOT EXISTS request_data JSONB,
ADD COLUMN IF NOT EXISTS response_data JSONB,
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update existing columns
ALTER TABLE license_validation_audit 
ALTER COLUMN ip_address TYPE TEXT USING ip_address::TEXT;

-- Set default values for existing rows
UPDATE license_validation_audit 
SET 
  event_type = 'license_validate',
  success = CASE 
    WHEN validation_result->>'is_valid' = 'true' THEN true 
    ELSE false 
  END,
  response_data = validation_result
WHERE event_type IS NULL;

-- Make event_type NOT NULL after setting defaults
ALTER TABLE license_validation_audit 
ALTER COLUMN event_type SET NOT NULL;

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_license_validation_audit_user_id ON license_validation_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_license_validation_audit_ip_address ON license_validation_audit(ip_address);
CREATE INDEX IF NOT EXISTS idx_license_validation_audit_event_type ON license_validation_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_license_validation_audit_created_at ON license_validation_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_license_validation_audit_success ON license_validation_audit(success);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_license_validation_audit_user_event_time 
  ON license_validation_audit(user_id, event_type, created_at DESC);

-- Update RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own audit logs" ON license_validation_audit;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON license_validation_audit;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON license_validation_audit;

-- Create new RLS policies
-- Only authenticated users can view their own audit logs
CREATE POLICY "Users can view their own audit logs" ON license_validation_audit
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert audit logs (from Edge Functions)
CREATE POLICY "Service role can insert audit logs" ON license_validation_audit
  FOR INSERT WITH CHECK (true);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs" ON license_validation_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON license_validation_audit TO authenticated;
GRANT INSERT ON license_validation_audit TO service_role;
GRANT ALL ON license_validation_audit TO postgres;

-- Create function to get audit statistics
CREATE OR REPLACE FUNCTION get_license_audit_stats(
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if user is admin or requesting their own stats
  IF p_user_id IS NOT NULL AND p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;
  
  -- If no specific user requested and not admin, use current user
  IF p_user_id IS NULL AND NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    p_user_id := auth.uid();
  END IF;
  
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'successful_events', COUNT(*) FILTER (WHERE success = true),
    'failed_events', COUNT(*) FILTER (WHERE success = false),
    'validation_events', COUNT(*) FILTER (WHERE event_type = 'license_validate'),
    'activation_events', COUNT(*) FILTER (WHERE event_type = 'license_activate'),
    'deactivation_events', COUNT(*) FILTER (WHERE event_type = 'license_deactivate'),
    'unique_ips', COUNT(DISTINCT ip_address),
    'date_range', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'events_by_day', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', date_trunc('day', created_at),
          'count', count
        ) ORDER BY date_trunc('day', created_at)
      )
      FROM (
        SELECT 
          date_trunc('day', created_at) as day,
          COUNT(*) as count
        FROM license_validation_audit
        WHERE created_at BETWEEN p_start_date AND p_end_date
          AND (p_user_id IS NULL OR user_id = p_user_id)
        GROUP BY date_trunc('day', created_at)
      ) daily_stats
    )
  ) INTO result
  FROM license_validation_audit
  WHERE created_at BETWEEN p_start_date AND p_end_date
    AND (p_user_id IS NULL OR user_id = p_user_id);
  
  RETURN COALESCE(result, '{"total_events": 0}'::jsonb);
END;
$$;

-- Create function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_license_activity(
  p_time_window INTERVAL DEFAULT INTERVAL '1 hour',
  p_failure_threshold INTEGER DEFAULT 5
)
RETURNS TABLE(
  ip_address TEXT,
  user_id UUID,
  failure_count BIGINT,
  first_failure TIMESTAMP WITH TIME ZONE,
  last_failure TIMESTAMP WITH TIME ZONE,
  risk_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can run this function
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied - admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    a.ip_address,
    a.user_id,
    COUNT(*) as failure_count,
    MIN(a.created_at) as first_failure,
    MAX(a.created_at) as last_failure,
    CASE 
      WHEN COUNT(*) >= p_failure_threshold * 3 THEN 'HIGH'
      WHEN COUNT(*) >= p_failure_threshold * 2 THEN 'MEDIUM'
      WHEN COUNT(*) >= p_failure_threshold THEN 'LOW'
      ELSE 'NORMAL'
    END as risk_level
  FROM license_validation_audit a
  WHERE a.created_at >= NOW() - p_time_window
    AND a.success = false
  GROUP BY a.ip_address, a.user_id
  HAVING COUNT(*) >= p_failure_threshold
  ORDER BY failure_count DESC, last_failure DESC;
END;
$$;

-- Create function to clean old audit logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Only admins can run cleanup
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied - admin role required';
  END IF;
  
  DELETE FROM license_validation_audit
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_license_audit_stats TO authenticated;
GRANT EXECUTE ON FUNCTION detect_suspicious_license_activity TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO authenticated;

-- Create a view for recent security events (last 24 hours)
CREATE OR REPLACE VIEW recent_license_security_events AS
SELECT 
  id,
  event_type,
  user_id,
  ip_address,
  success,
  error_message,
  created_at,
  CASE 
    WHEN NOT success AND event_type = 'license_activate' THEN 'Failed Activation Attempt'
    WHEN NOT success AND event_type = 'license_validate' THEN 'Failed Validation'
    WHEN success AND event_type = 'license_activate' THEN 'Successful Activation'
    ELSE 'Other Event'
  END as event_description
FROM license_validation_audit
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Grant access to the view
GRANT SELECT ON recent_license_security_events TO authenticated;

-- Add comment to table
COMMENT ON TABLE license_validation_audit IS 'Audit trail for all license validation, activation, and deactivation events for security monitoring';

-- Add comments to new columns
COMMENT ON COLUMN license_validation_audit.event_type IS 'Type of license event: license_validate, license_activate, license_deactivate';
COMMENT ON COLUMN license_validation_audit.request_data IS 'JSON data of the original request';
COMMENT ON COLUMN license_validation_audit.response_data IS 'JSON data of the response';
COMMENT ON COLUMN license_validation_audit.success IS 'Whether the operation was successful';
COMMENT ON COLUMN license_validation_audit.error_message IS 'Error message if operation failed';