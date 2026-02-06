-- =====================================================
-- MiKO Plastic Surgery - Audit Logs Table
-- HIPAA Compliance: §164.312(b) Audit Controls
-- =====================================================
-- This migration creates the audit_logs table for tracking
-- all access to Protected Health Information (PHI)
-- =====================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- User identification
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,

  -- Action details (includes both app-level and trigger-level actions)
  action TEXT NOT NULL CHECK (action IN ('view', 'create', 'update', 'delete', 'export', 'login', 'logout', 'failed_login', 'INSERT', 'UPDATE', 'DELETE')),
  resource_type TEXT NOT NULL,
  resource_id UUID,

  -- Context
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,

  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action_time
  ON audit_logs(user_id, action, timestamp DESC);

-- Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs (important for security)
CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- All authenticated users can insert audit logs (for their own actions)
CREATE POLICY "Authenticated users can create audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Anonymous users can insert audit logs (for failed login attempts)
CREATE POLICY "Anonymous can create audit logs for login attempts"
  ON audit_logs
  FOR INSERT
  TO anon
  WITH CHECK (action IN ('failed_login', 'login'));

-- No one can update or delete audit logs (immutable for compliance)
-- This is enforced by NOT creating UPDATE or DELETE policies

-- Create a function to automatically log certain actions
CREATE OR REPLACE FUNCTION log_phi_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to PHI tables
  INSERT INTO audit_logs (
    user_id,
    user_email,
    action,
    resource_type,
    resource_id,
    details,
    timestamp
  ) VALUES (
    auth.uid(),
    COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), 'system'),
    TG_OP,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA
    ),
    NOW()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to PHI tables for automatic audit logging
-- Note: Only for INSERT, UPDATE, DELETE - not SELECT (would be too noisy)

-- Leads table (contains patient contact info)
DROP TRIGGER IF EXISTS audit_leads_changes ON leads;
CREATE TRIGGER audit_leads_changes
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_phi_access();

-- Clinical interests table (contains medical interests)
DROP TRIGGER IF EXISTS audit_clinical_interests_changes ON clinical_interests;
CREATE TRIGGER audit_clinical_interests_changes
  AFTER INSERT OR UPDATE OR DELETE ON clinical_interests
  FOR EACH ROW
  EXECUTE FUNCTION log_phi_access();

-- Appointments table (contains appointment details)
DROP TRIGGER IF EXISTS audit_appointments_changes ON appointments;
CREATE TRIGGER audit_appointments_changes
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION log_phi_access();

-- Chat sessions table (contains conversation data)
DROP TRIGGER IF EXISTS audit_chat_sessions_changes ON chat_sessions;
CREATE TRIGGER audit_chat_sessions_changes
  AFTER INSERT OR UPDATE OR DELETE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION log_phi_access();

-- Create a view for easy audit log querying
CREATE OR REPLACE VIEW audit_log_summary AS
SELECT
  al.id,
  al.user_email,
  al.action,
  al.resource_type,
  al.resource_id,
  al.details,
  al.timestamp,
  al.ip_address,
  CASE
    WHEN al.user_id IS NOT NULL THEN
      (SELECT string_agg(role, ', ') FROM user_roles WHERE user_id = al.user_id)
    ELSE 'anonymous'
  END as user_roles
FROM audit_logs al
ORDER BY al.timestamp DESC;

-- Grant access to the view
GRANT SELECT ON audit_log_summary TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'HIPAA-compliant audit log for tracking all PHI access. Immutable - no updates or deletes allowed.';
COMMENT ON COLUMN audit_logs.action IS 'Action performed: view, create, update, delete, export, login, logout, failed_login';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource accessed: lead, appointment, report, session, etc.';
COMMENT ON COLUMN audit_logs.details IS 'Additional context about the action in JSON format';
