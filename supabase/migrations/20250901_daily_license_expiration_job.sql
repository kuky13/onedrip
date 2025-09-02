-- Migration: Daily License Expiration Job
-- Description: Implement a daily routine that automatically updates expired licenses
--              to inactive status using pg_cron
-- Date: 2025-09-01

-- 1. Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create function to update expired licenses
CREATE OR REPLACE FUNCTION public.update_expired_licenses_daily()
RETURNS TABLE(
  updated_count INTEGER,
  execution_time TIMESTAMPTZ,
  details JSONB
) AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_execution_time TIMESTAMPTZ := NOW();
  v_expired_licenses JSONB;
  v_details JSONB;
BEGIN
  -- Get list of licenses that will be updated (for logging)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'code', l.code,
        'user_id', l.user_id,
        'expires_at', l.expires_at,
        'days_expired', EXTRACT(DAY FROM (NOW() - l.expires_at))
      )
    ), 
    '[]'::jsonb
  ) INTO v_expired_licenses
  FROM public.licenses l
  WHERE l.is_active = TRUE 
    AND l.expires_at IS NOT NULL 
    AND l.expires_at <= NOW();

  -- Update expired licenses to inactive
  UPDATE public.licenses 
  SET 
    is_active = FALSE,
    last_validation = NOW()
  WHERE 
    is_active = TRUE 
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
  
  -- Get the count of updated records
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Build details object
  v_details := jsonb_build_object(
    'execution_timestamp', v_execution_time,
    'updated_licenses_count', v_updated_count,
    'expired_licenses', v_expired_licenses,
    'function_name', 'update_expired_licenses_daily',
    'status', CASE 
      WHEN v_updated_count > 0 THEN 'success_with_updates'
      ELSE 'success_no_updates'
    END
  );
  
  -- Log the execution (insert into a log table if it exists)
  -- This will fail silently if the table doesn't exist
  BEGIN
    INSERT INTO public.license_expiration_log (
      execution_time,
      updated_count,
      details
    ) VALUES (
      v_execution_time,
      v_updated_count,
      v_details
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, continue without logging
      NULL;
  END;
  
  -- Return results
  RETURN QUERY SELECT v_updated_count, v_execution_time, v_details;
END;
$$ LANGUAGE plpgsql;

-- 3. Create log table for tracking executions (optional but recommended)
CREATE TABLE IF NOT EXISTS public.license_expiration_log (
  id SERIAL PRIMARY KEY,
  execution_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_count INTEGER NOT NULL DEFAULT 0,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_license_expiration_log_execution_time 
ON public.license_expiration_log(execution_time DESC);

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_expired_licenses_daily() TO postgres;
GRANT INSERT, SELECT ON public.license_expiration_log TO postgres;
GRANT USAGE, SELECT ON SEQUENCE license_expiration_log_id_seq TO postgres;

-- 5. Schedule the daily job using pg_cron
-- This will run every day at 2:00 AM UTC
SELECT cron.schedule(
  'daily-license-expiration-check',
  '0 2 * * *',
  'SELECT public.update_expired_licenses_daily();'
);

-- 6. Create function to manually trigger the update (for testing)
CREATE OR REPLACE FUNCTION public.manual_update_expired_licenses()
RETURNS TABLE(
  updated_count INTEGER,
  execution_time TIMESTAMPTZ,
  details JSONB
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Call the main function
  RETURN QUERY SELECT * FROM public.update_expired_licenses_daily();
END;
$$ LANGUAGE plpgsql;

-- Grant permission for manual function
GRANT EXECUTE ON FUNCTION public.manual_update_expired_licenses() TO authenticated;

-- 7. Create function to check cron job status
CREATE OR REPLACE FUNCTION public.get_license_expiration_job_status()
RETURNS TABLE(
  job_name TEXT,
  schedule TEXT,
  active BOOLEAN,
  last_execution TIMESTAMPTZ,
  next_execution TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Return cron job information
  RETURN QUERY 
  SELECT 
    cj.jobname::TEXT,
    cj.schedule::TEXT,
    cj.active,
    NULL::TIMESTAMPTZ as last_execution, -- pg_cron doesn't store this by default
    NULL::TIMESTAMPTZ as next_execution  -- Would need calculation based on schedule
  FROM cron.job cj 
  WHERE cj.jobname = 'daily-license-expiration-check';
END;
$$ LANGUAGE plpgsql;

-- Grant permission for status function
GRANT EXECUTE ON FUNCTION public.get_license_expiration_job_status() TO authenticated;

-- 8. Create function to get recent expiration log entries
CREATE OR REPLACE FUNCTION public.get_license_expiration_history(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id INTEGER,
  execution_time TIMESTAMPTZ,
  updated_count INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Return recent log entries
  RETURN QUERY 
  SELECT 
    l.id,
    l.execution_time,
    l.updated_count,
    l.details,
    l.created_at
  FROM public.license_expiration_log l
  ORDER BY l.execution_time DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant permission for history function
GRANT EXECUTE ON FUNCTION public.get_license_expiration_history(INTEGER) TO authenticated;

-- 9. Add helpful comments
COMMENT ON FUNCTION public.update_expired_licenses_daily() IS 
'Daily function that automatically updates expired licenses to inactive status. Scheduled to run at 2:00 AM UTC daily.';

COMMENT ON FUNCTION public.manual_update_expired_licenses() IS 
'Admin function to manually trigger the expired license update process.';

COMMENT ON FUNCTION public.get_license_expiration_job_status() IS 
'Admin function to check the status of the daily license expiration cron job.';

COMMENT ON FUNCTION public.get_license_expiration_history(INTEGER) IS 
'Admin function to view the history of license expiration job executions.';

COMMENT ON TABLE public.license_expiration_log IS 
'Log table tracking executions of the daily license expiration update job.';

-- 10. Create a view for easy monitoring
CREATE OR REPLACE VIEW public.admin_license_expiration_monitor AS
SELECT 
  -- Current expired but still active licenses
  (
    SELECT COUNT(*) 
    FROM public.licenses 
    WHERE is_active = TRUE 
      AND expires_at IS NOT NULL 
      AND expires_at <= NOW()
  ) as expired_active_licenses,
  
  -- Total active licenses
  (
    SELECT COUNT(*) 
    FROM public.licenses 
    WHERE is_active = TRUE
  ) as total_active_licenses,
  
  -- Licenses expiring in next 7 days
  (
    SELECT COUNT(*) 
    FROM public.licenses 
    WHERE is_active = TRUE 
      AND expires_at IS NOT NULL 
      AND expires_at BETWEEN NOW() AND (NOW() + INTERVAL '7 days')
  ) as expiring_soon_licenses,
  
  -- Last job execution
  (
    SELECT execution_time 
    FROM public.license_expiration_log 
    ORDER BY execution_time DESC 
    LIMIT 1
  ) as last_job_execution,
  
  -- Last job update count
  (
    SELECT updated_count 
    FROM public.license_expiration_log 
    ORDER BY execution_time DESC 
    LIMIT 1
  ) as last_job_updated_count,
  
  NOW() as current_time;

-- Grant view access
GRANT SELECT ON public.admin_license_expiration_monitor TO authenticated;

-- 11. Test the function immediately (optional - uncomment to test)
-- SELECT * FROM public.update_expired_licenses_daily();

-- 12. Show current cron jobs (for verification)
-- SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'daily-license-expiration-check';