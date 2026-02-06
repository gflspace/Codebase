-- ============================================================================
-- MiKO Clinical Concierge System - Row Level Security Policies
-- Migration: 004_rls_policies.sql
-- Description: HIPAA-compliant RLS policies for all tables
-- ============================================================================

-- ============================================================================
-- USER ROLES TABLE
-- Custom roles for the application (supplements Supabase auth.users)
-- ============================================================================

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'clinical_reviewer', 'readonly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Index for role lookups
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if current user has a specific role
CREATE OR REPLACE FUNCTION auth.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user has any of the specified roles
CREATE OR REPLACE FUNCTION auth.has_any_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_role('admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is staff or higher
CREATE OR REPLACE FUNCTION auth.is_staff_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_any_role(ARRAY['admin', 'staff', 'clinical_reviewer']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is clinical reviewer
CREATE OR REPLACE FUNCTION auth.is_clinical_reviewer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_any_role(ARRAY['admin', 'clinical_reviewer']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_qual_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- LEADS TABLE POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY leads_admin_all ON leads
  FOR ALL
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Staff: Read all, update assigned leads
CREATE POLICY leads_staff_select ON leads
  FOR SELECT
  TO authenticated
  USING (auth.is_staff_or_above());

CREATE POLICY leads_staff_insert ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.is_staff_or_above());

CREATE POLICY leads_staff_update ON leads
  FOR UPDATE
  TO authenticated
  USING (
    auth.is_staff_or_above()
    AND (
      auth.is_admin()
      OR assigned_to = auth.uid()
      OR assigned_to IS NULL
    )
  )
  WITH CHECK (auth.is_staff_or_above());

-- Readonly: Select only
CREATE POLICY leads_readonly_select ON leads
  FOR SELECT
  TO authenticated
  USING (auth.has_role('readonly'));

-- Service role bypass (for n8n webhooks)
CREATE POLICY leads_service_all ON leads
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- CLINICAL_INTERESTS TABLE POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY clinical_interests_admin_all ON clinical_interests
  FOR ALL
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Staff: Read all, insert/update
CREATE POLICY clinical_interests_staff_select ON clinical_interests
  FOR SELECT
  TO authenticated
  USING (auth.is_staff_or_above());

CREATE POLICY clinical_interests_staff_insert ON clinical_interests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.is_staff_or_above());

CREATE POLICY clinical_interests_staff_update ON clinical_interests
  FOR UPDATE
  TO authenticated
  USING (auth.is_staff_or_above())
  WITH CHECK (auth.is_staff_or_above());

-- Clinical reviewer: Can qualify
CREATE POLICY clinical_interests_reviewer_update ON clinical_interests
  FOR UPDATE
  TO authenticated
  USING (auth.is_clinical_reviewer())
  WITH CHECK (auth.is_clinical_reviewer());

-- Service role bypass
CREATE POLICY clinical_interests_service_all ON clinical_interests
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- AI_QUAL_LOGS TABLE POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY ai_qual_logs_admin_all ON ai_qual_logs
  FOR ALL
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Staff: Read all, insert
CREATE POLICY ai_qual_logs_staff_select ON ai_qual_logs
  FOR SELECT
  TO authenticated
  USING (auth.is_staff_or_above());

-- Clinical reviewer: Can add review notes
CREATE POLICY ai_qual_logs_reviewer_update ON ai_qual_logs
  FOR UPDATE
  TO authenticated
  USING (auth.is_clinical_reviewer())
  WITH CHECK (auth.is_clinical_reviewer());

-- Service role bypass (for AI system)
CREATE POLICY ai_qual_logs_service_all ON ai_qual_logs
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- COMMUNICATION_AUDIT TABLE POLICIES
-- Stricter policies due to HIPAA sensitivity
-- ============================================================================

-- Admin: Full access
CREATE POLICY comm_audit_admin_all ON communication_audit
  FOR ALL
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Staff: Read only (audit logs should be immutable)
CREATE POLICY comm_audit_staff_select ON communication_audit
  FOR SELECT
  TO authenticated
  USING (auth.is_staff_or_above());

-- No update/delete for non-admins (immutable audit trail)
-- Service role can insert (for system logging)
CREATE POLICY comm_audit_service_insert ON communication_audit
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY comm_audit_service_select ON communication_audit
  FOR SELECT
  TO service_role
  USING (TRUE);

-- ============================================================================
-- CHAT_SESSIONS TABLE POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY chat_sessions_admin_all ON chat_sessions
  FOR ALL
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Staff: Read all, can handle sessions
CREATE POLICY chat_sessions_staff_select ON chat_sessions
  FOR SELECT
  TO authenticated
  USING (auth.is_staff_or_above());

CREATE POLICY chat_sessions_staff_update ON chat_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.is_staff_or_above())
  WITH CHECK (auth.is_staff_or_above());

-- Service role bypass
CREATE POLICY chat_sessions_service_all ON chat_sessions
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- APPOINTMENTS TABLE POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY appointments_admin_all ON appointments
  FOR ALL
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Staff: Full CRUD
CREATE POLICY appointments_staff_all ON appointments
  FOR ALL
  TO authenticated
  USING (auth.is_staff_or_above())
  WITH CHECK (auth.is_staff_or_above());

-- Readonly: Select only
CREATE POLICY appointments_readonly_select ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.has_role('readonly'));

-- Service role bypass
CREATE POLICY appointments_service_all ON appointments
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- APPOINTMENT_REMINDERS TABLE POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY reminders_admin_all ON appointment_reminders
  FOR ALL
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Staff: Read all
CREATE POLICY reminders_staff_select ON appointment_reminders
  FOR SELECT
  TO authenticated
  USING (auth.is_staff_or_above());

-- Service role bypass
CREATE POLICY reminders_service_all ON appointment_reminders
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- AVAILABILITY_BLOCKS TABLE POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY availability_admin_all ON availability_blocks
  FOR ALL
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Staff: Read all
CREATE POLICY availability_staff_select ON availability_blocks
  FOR SELECT
  TO authenticated
  USING (auth.is_staff_or_above());

-- Service role bypass
CREATE POLICY availability_service_all ON availability_blocks
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Anonymous: Read availability only (for public booking)
CREATE POLICY availability_anon_select ON availability_blocks
  FOR SELECT
  TO anon
  USING (is_available = TRUE);

-- ============================================================================
-- WAITLIST TABLE POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY waitlist_admin_all ON waitlist
  FOR ALL
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Staff: Full CRUD
CREATE POLICY waitlist_staff_all ON waitlist
  FOR ALL
  TO authenticated
  USING (auth.is_staff_or_above())
  WITH CHECK (auth.is_staff_or_above());

-- Service role bypass
CREATE POLICY waitlist_service_all ON waitlist
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- USER_ROLES TABLE POLICIES
-- ============================================================================

-- Admin only: Full access to roles
CREATE POLICY user_roles_admin_all ON user_roles
  FOR ALL
  TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Users can read their own roles
CREATE POLICY user_roles_self_select ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_roles IS 'Application roles for RLS enforcement';
COMMENT ON FUNCTION auth.has_role IS 'Check if current user has specific role';
COMMENT ON FUNCTION auth.has_any_role IS 'Check if current user has any of specified roles';
COMMENT ON FUNCTION auth.is_admin IS 'Check if current user is admin';
COMMENT ON FUNCTION auth.is_staff_or_above IS 'Check if current user is staff, clinical_reviewer, or admin';
COMMENT ON FUNCTION auth.is_clinical_reviewer IS 'Check if current user can perform clinical reviews';
