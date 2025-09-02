-- Migration: Create rate limiting table for anti-spam system
-- Created: 2025-01-28
-- Description: Table to store rate limiting data and anti-spam tracking

-- Create rate_limiting table
CREATE TABLE IF NOT EXISTS rate_limiting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rate limiting key (IP, user_id, endpoint, etc.)
  key_type VARCHAR(50) NOT NULL CHECK (key_type IN ('ip', 'user', 'endpoint', 'global')),
  key_value VARCHAR(255) NOT NULL,
  
  -- Rate limiting data
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  
  -- Anti-spam tracking
  spam_score INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  block_reason TEXT,
  block_expires_at TIMESTAMPTZ,
  
  -- Request metadata
  user_agent TEXT,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  
  -- Penalty tracking
  penalty_level INTEGER NOT NULL DEFAULT 0,
  penalty_expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(key_type, key_value, window_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limiting_key ON rate_limiting(key_type, key_value);
CREATE INDEX IF NOT EXISTS idx_rate_limiting_window ON rate_limiting(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limiting_blocked ON rate_limiting(is_blocked, block_expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limiting_penalty ON rate_limiting(penalty_level, penalty_expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limiting_updated ON rate_limiting(updated_at);
CREATE INDEX IF NOT EXISTS idx_rate_limiting_spam_score ON rate_limiting(spam_score);

-- Enable Row Level Security
ALTER TABLE rate_limiting ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admin can see all rate limiting data
CREATE POLICY "Admin can view all rate limiting data" ON rate_limiting
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Service role can manage all data
CREATE POLICY "Service role can manage rate limiting data" ON rate_limiting
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can only see their own data
CREATE POLICY "Users can view own rate limiting data" ON rate_limiting
  FOR SELECT
  TO authenticated
  USING (
    key_type = 'user' AND key_value = auth.uid()::text
  );

-- Create spam_patterns table for pattern detection
CREATE TABLE IF NOT EXISTS spam_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern identification
  pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN (
    'rapid_requests', 'failed_auth', 'suspicious_user_agent', 
    'malicious_payload', 'bot_behavior', 'distributed_attack'
  )),
  pattern_name VARCHAR(100) NOT NULL,
  
  -- Pattern configuration
  threshold_value INTEGER NOT NULL,
  time_window_minutes INTEGER NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Actions
  block_duration_minutes INTEGER NOT NULL DEFAULT 60,
  penalty_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  
  -- Pattern details
  description TEXT,
  regex_pattern TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for spam_patterns
CREATE INDEX IF NOT EXISTS idx_spam_patterns_type ON spam_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_spam_patterns_active ON spam_patterns(is_active);
CREATE INDEX IF NOT EXISTS idx_spam_patterns_severity ON spam_patterns(severity);

-- Enable RLS for spam_patterns
ALTER TABLE spam_patterns ENABLE ROW LEVEL SECURITY;

-- RLS policies for spam_patterns
CREATE POLICY "Admin can manage spam patterns" ON spam_patterns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Service role can manage spam patterns" ON spam_patterns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default spam patterns
INSERT INTO spam_patterns (pattern_type, pattern_name, threshold_value, time_window_minutes, severity, block_duration_minutes, description) VALUES
('rapid_requests', 'Rapid API Requests', 100, 1, 'medium', 30, 'More than 100 requests per minute from same source'),
('rapid_requests', 'Extreme Rapid Requests', 500, 1, 'high', 120, 'More than 500 requests per minute - likely bot'),
('failed_auth', 'Failed Login Attempts', 10, 5, 'medium', 60, 'Multiple failed authentication attempts'),
('failed_auth', 'Brute Force Attack', 50, 10, 'high', 240, 'Suspected brute force authentication attack'),
('suspicious_user_agent', 'Bot User Agent', 1, 1, 'low', 15, 'Known bot or suspicious user agent detected'),
('malicious_payload', 'SQL Injection Attempt', 1, 1, 'high', 480, 'Potential SQL injection in request payload'),
('malicious_payload', 'XSS Attempt', 1, 1, 'high', 480, 'Potential XSS attack in request payload'),
('bot_behavior', 'Automated Behavior', 20, 1, 'medium', 60, 'Automated or scripted behavior detected'),
('distributed_attack', 'DDoS Pattern', 1000, 1, 'critical', 720, 'Distributed denial of service attack pattern');

-- Create rate_limiting_stats view for monitoring
CREATE OR REPLACE VIEW rate_limiting_stats AS
SELECT 
  key_type,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE is_blocked = true) as blocked_entries,
  COUNT(*) FILTER (WHERE spam_score > 50) as high_spam_score,
  AVG(spam_score) as avg_spam_score,
  MAX(spam_score) as max_spam_score,
  COUNT(*) FILTER (WHERE penalty_level > 0) as penalized_entries,
  AVG(penalty_level) as avg_penalty_level,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as recent_entries,
  COUNT(*) FILTER (WHERE last_request_at > NOW() - INTERVAL '5 minutes') as active_entries
FROM rate_limiting
GROUP BY key_type;

-- Create blocked_ips view for security monitoring
CREATE OR REPLACE VIEW blocked_ips AS
SELECT 
  rl.key_value as ip_address,
  rl.spam_score,
  rl.block_reason,
  rl.block_expires_at,
  rl.penalty_level,
  rl.request_count,
  rl.last_request_at,
  rl.created_at,
  up.name as blocked_by_user
FROM rate_limiting rl
LEFT JOIN user_profiles up ON up.id::text = rl.key_value
WHERE rl.key_type = 'ip' 
AND rl.is_blocked = true
AND (rl.block_expires_at IS NULL OR rl.block_expires_at > NOW())
ORDER BY rl.spam_score DESC, rl.last_request_at DESC;

-- Create recent_attacks view
CREATE OR REPLACE VIEW recent_attacks AS
SELECT 
  rl.key_type,
  rl.key_value,
  rl.spam_score,
  rl.request_count,
  rl.block_reason,
  rl.user_agent,
  rl.endpoint,
  rl.method,
  rl.last_request_at,
  CASE 
    WHEN rl.spam_score >= 80 THEN 'critical'
    WHEN rl.spam_score >= 60 THEN 'high'
    WHEN rl.spam_score >= 40 THEN 'medium'
    ELSE 'low'
  END as threat_level
FROM rate_limiting rl
WHERE rl.spam_score > 30
AND rl.last_request_at > NOW() - INTERVAL '24 hours'
ORDER BY rl.spam_score DESC, rl.last_request_at DESC
LIMIT 100;

-- Function to clean expired rate limiting entries
CREATE OR REPLACE FUNCTION clean_expired_rate_limiting()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired entries (older than 24 hours and not blocked)
  DELETE FROM rate_limiting 
  WHERE window_end < NOW() - INTERVAL '24 hours'
  AND (is_blocked = false OR block_expires_at < NOW())
  AND penalty_level = 0;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup
  INSERT INTO audit_logs (
    event_type, user_id, ip_address, event_details, severity
  ) VALUES (
    'rate_limiting_cleanup', 
    NULL, 
    '127.0.0.1', 
    jsonb_build_object('deleted_entries', deleted_count),
    'info'
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unblock expired blocks
CREATE OR REPLACE FUNCTION unblock_expired_entries()
RETURNS INTEGER AS $$
DECLARE
  unblocked_count INTEGER;
BEGIN
  -- Unblock expired entries
  UPDATE rate_limiting 
  SET 
    is_blocked = false,
    block_reason = NULL,
    block_expires_at = NULL,
    updated_at = NOW()
  WHERE is_blocked = true 
  AND block_expires_at IS NOT NULL 
  AND block_expires_at < NOW();
  
  GET DIAGNOSTICS unblocked_count = ROW_COUNT;
  
  -- Log unblocking
  INSERT INTO audit_logs (
    event_type, user_id, ip_address, event_details, severity
  ) VALUES (
    'rate_limiting_unblock', 
    NULL, 
    '127.0.0.1', 
    jsonb_build_object('unblocked_entries', unblocked_count),
    'info'
  );
  
  RETURN unblocked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rate limiting summary
CREATE OR REPLACE FUNCTION get_rate_limiting_summary()
RETURNS TABLE (
  total_entries BIGINT,
  blocked_entries BIGINT,
  high_risk_entries BIGINT,
  recent_attacks BIGINT,
  top_blocked_ips JSONB,
  pattern_matches JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM rate_limiting)::BIGINT,
    (SELECT COUNT(*) FROM rate_limiting WHERE is_blocked = true)::BIGINT,
    (SELECT COUNT(*) FROM rate_limiting WHERE spam_score > 70)::BIGINT,
    (SELECT COUNT(*) FROM rate_limiting WHERE spam_score > 30 AND last_request_at > NOW() - INTERVAL '1 hour')::BIGINT,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'ip', key_value,
          'spam_score', spam_score,
          'request_count', request_count,
          'block_reason', block_reason
        )
      )
      FROM (
        SELECT key_value, spam_score, request_count, block_reason
        FROM rate_limiting 
        WHERE key_type = 'ip' AND is_blocked = true
        ORDER BY spam_score DESC
        LIMIT 10
      ) top_ips
    ),
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'pattern_name', pattern_name,
          'severity', severity,
          'matches', (
            SELECT COUNT(*) 
            FROM rate_limiting 
            WHERE block_reason LIKE '%' || pattern_name || '%'
          )
        )
      )
      FROM spam_patterns 
      WHERE is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rate_limiting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rate_limiting_updated_at
  BEFORE UPDATE ON rate_limiting
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limiting_updated_at();

CREATE TRIGGER trigger_update_spam_patterns_updated_at
  BEFORE UPDATE ON spam_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limiting_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limiting TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON spam_patterns TO authenticated;
GRANT SELECT ON rate_limiting_stats TO authenticated;
GRANT SELECT ON blocked_ips TO authenticated;
GRANT SELECT ON recent_attacks TO authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_rate_limiting() TO authenticated;
GRANT EXECUTE ON FUNCTION unblock_expired_entries() TO authenticated;
GRANT EXECUTE ON FUNCTION get_rate_limiting_summary() TO authenticated;

-- Grant full access to service role
GRANT ALL PRIVILEGES ON rate_limiting TO service_role;
GRANT ALL PRIVILEGES ON spam_patterns TO service_role;
GRANT ALL PRIVILEGES ON rate_limiting_stats TO service_role;
GRANT ALL PRIVILEGES ON blocked_ips TO service_role;
GRANT ALL PRIVILEGES ON recent_attacks TO service_role;

-- Grant permissions to anon role for basic operations
GRANT SELECT ON rate_limiting TO anon;
GRANT SELECT ON spam_patterns TO anon;