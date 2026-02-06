-- ============================================================================
-- MiKO Clinical Concierge System - Complete Database Schema
-- Master Migration Script
-- ============================================================================
--
-- INSTRUCTIONS:
-- 1. Connect to your Supabase database via SQL Editor
-- 2. Run this entire script in order
-- 3. Verify no errors in output
--
-- This script creates:
-- - Core tables (leads, clinical_interests)
-- - Communication tables (ai_qual_logs, communication_audit, chat_sessions)
-- - Scheduling tables (appointments, appointment_reminders, availability_blocks, waitlist)
-- - User roles and RLS policies
-- - Helper functions and views
--
-- ============================================================================

-- ============================================================================
-- PART 1: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PART 2: ENUM TYPES
-- ============================================================================

-- Lead status state machine
CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted',
  'qualified',
  'booked',
  'completed',
  'no_show',
  'archived',
  'disqualified'
);

-- Lead source channels
CREATE TYPE lead_source AS ENUM (
  'website',
  'instagram',
  'facebook',
  'google_ads',
  'referral',
  'phone',
  'walk_in',
  'realself',
  'yelp',
  'other'
);

-- Procedure categories
CREATE TYPE procedure_category AS ENUM (
  'facial',
  'breast',
  'body',
  'non_surgical',
  'reconstruction',
  'revision',
  'other'
);

-- Risk levels
CREATE TYPE risk_level AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Communication channels
CREATE TYPE comm_channel AS ENUM (
  'sms',
  'email',
  'web_chat',
  'phone',
  'whatsapp',
  'in_person'
);

-- Communication direction
CREATE TYPE comm_direction AS ENUM (
  'inbound',
  'outbound'
);

-- AI intent classifications
CREATE TYPE ai_intent AS ENUM (
  'booking_request',
  'procedure_inquiry',
  'pricing_question',
  'location_hours',
  'post_op_question',
  'emergency_medical',
  'complaint',
  'general_inquiry',
  'follow_up',
  'cancellation',
  'reschedule',
  'unknown'
);

-- AI action types
CREATE TYPE ai_action AS ENUM (
  'responded',
  'escalated',
  'booked_appointment',
  'transferred_to_human',
  'collected_info',
  'provided_info',
  'no_action'
);

-- Appointment types
CREATE TYPE appointment_type AS ENUM (
  'virtual',
  'in_person',
  'phone',
  'follow_up',
  'pre_op',
  'post_op',
  'procedure'
);

-- Appointment status
CREATE TYPE appointment_status AS ENUM (
  'pending',
  'confirmed',
  'reminded',
  'checked_in',
  'in_progress',
  'completed',
  'no_show',
  'cancelled',
  'rescheduled'
);

-- Cancellation reasons
CREATE TYPE cancellation_reason AS ENUM (
  'patient_request',
  'schedule_conflict',
  'illness',
  'emergency',
  'weather',
  'provider_unavailable',
  'no_response',
  'other'
);

-- ============================================================================
-- PART 3: CORE TABLES
-- ============================================================================

-- LEADS TABLE
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  status lead_status NOT NULL DEFAULT 'new',
  source lead_source NOT NULL DEFAULT 'website',
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  risk_level risk_level DEFAULT 'low',
  risk_flags TEXT[] DEFAULT '{}',
  requires_clinical_review BOOLEAN DEFAULT FALSE,
  clinical_review_completed_at TIMESTAMPTZ,
  clinical_reviewer_id UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer_url TEXT,
  landing_page TEXT,
  notes TEXT,
  internal_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_contacted_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$'),
  CONSTRAINT has_contact_method CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- CLINICAL_INTERESTS TABLE
CREATE TABLE clinical_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  procedure_category procedure_category NOT NULL,
  specific_procedure TEXT NOT NULL,
  interest_level INTEGER DEFAULT 5 CHECK (interest_level >= 1 AND interest_level <= 10),
  timeline TEXT,
  budget_range TEXT,
  is_revision BOOLEAN DEFAULT FALSE,
  has_prior_surgery BOOLEAN DEFAULT FALSE,
  prior_surgery_details TEXT,
  ai_qualified BOOLEAN,
  ai_qualification_score DECIMAL(5,2),
  ai_qualification_notes TEXT,
  staff_qualified BOOLEAN,
  staff_qualification_notes TEXT,
  qualified_by UUID REFERENCES auth.users(id),
  qualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, specific_procedure)
);

-- ============================================================================
-- PART 4: COMMUNICATION TABLES
-- ============================================================================

-- AI_QUAL_LOGS TABLE
CREATE TABLE ai_qual_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  input_message TEXT NOT NULL,
  input_channel comm_channel NOT NULL DEFAULT 'web_chat',
  intent_detected ai_intent NOT NULL DEFAULT 'unknown',
  intent_confidence DECIMAL(5,4) CHECK (intent_confidence >= 0 AND intent_confidence <= 1),
  risk_keywords_detected TEXT[] DEFAULT '{}',
  risk_score DECIMAL(5,2) DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  escalated BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,
  ai_response TEXT NOT NULL,
  ai_action ai_action NOT NULL DEFAULT 'responded',
  suggested_actions JSONB DEFAULT '[]',
  model_used TEXT DEFAULT 'gpt-4',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  response_time_ms INTEGER,
  qualification_result JSONB,
  procedure_identified TEXT,
  next_step TEXT,
  human_reviewed BOOLEAN DEFAULT FALSE,
  human_reviewer_id UUID REFERENCES auth.users(id),
  human_review_notes TEXT,
  response_quality_score INTEGER CHECK (response_quality_score >= 1 AND response_quality_score <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- CHAT_SESSIONS TABLE
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  conversation_summary TEXT,
  current_intent ai_intent,
  context_data JSONB DEFAULT '{}',
  collected_data JSONB DEFAULT '{}',
  source_page TEXT,
  user_agent TEXT,
  ip_address INET,
  handed_off_to_human BOOLEAN DEFAULT FALSE,
  handoff_reason TEXT,
  handled_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 5: SCHEDULING TABLES
-- ============================================================================

-- APPOINTMENTS TABLE
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  appointment_type appointment_type NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  end_time TIMESTAMPTZ GENERATED ALWAYS AS (scheduled_at + (duration_minutes || ' minutes')::INTERVAL) STORED,
  location TEXT,
  virtual_meeting_url TEXT,
  virtual_meeting_id TEXT,
  virtual_meeting_password TEXT,
  procedure_of_interest TEXT,
  consultation_notes TEXT,
  google_calendar_event_id TEXT,
  google_calendar_link TEXT,
  confirmation_sent_at TIMESTAMPTZ,
  reminder_48h_sent_at TIMESTAMPTZ,
  reminder_24h_sent_at TIMESTAMPTZ,
  reminder_2h_sent_at TIMESTAMPTZ,
  patient_confirmed BOOLEAN DEFAULT FALSE,
  patient_confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason cancellation_reason,
  cancellation_notes TEXT,
  rescheduled_from_id UUID REFERENCES appointments(id),
  rescheduled_to_id UUID REFERENCES appointments(id),
  marked_no_show_at TIMESTAMPTZ,
  no_show_follow_up_sent BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  outcome_notes TEXT,
  next_steps TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  assigned_provider TEXT DEFAULT 'Dr. Michael K. Obeng',
  coordinator_id UUID REFERENCES auth.users(id),
  booked_via TEXT DEFAULT 'ai_chat',
  booked_by_user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMMUNICATION_AUDIT TABLE (after appointments for FK)
CREATE TABLE communication_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  channel comm_channel NOT NULL,
  direction comm_direction NOT NULL,
  recipient_identifier TEXT NOT NULL,
  sender_identifier TEXT NOT NULL,
  subject TEXT,
  message_body TEXT NOT NULL,
  message_type TEXT,
  delivery_status TEXT DEFAULT 'pending',
  delivery_timestamp TIMESTAMPTZ,
  delivery_error TEXT,
  external_message_id TEXT,
  external_provider TEXT,
  workflow_id TEXT,
  workflow_execution_id TEXT,
  triggered_by TEXT,
  sent_by_user_id UUID REFERENCES auth.users(id),
  contains_phi BOOLEAN DEFAULT TRUE,
  encryption_status TEXT DEFAULT 'encrypted',
  retention_category TEXT DEFAULT 'medical_record',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- APPOINTMENT_REMINDERS TABLE
CREATE TABLE appointment_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  channel comm_channel NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'pending',
  external_message_id TEXT,
  delivery_error TEXT,
  patient_responded BOOLEAN DEFAULT FALSE,
  patient_response TEXT,
  response_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AVAILABILITY_BLOCKS TABLE
CREATE TABLE availability_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  block_reason TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  provider_name TEXT DEFAULT 'Dr. Michael K. Obeng',
  allowed_appointment_types appointment_type[] DEFAULT ARRAY['virtual', 'in_person', 'phone']::appointment_type[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- WAITLIST TABLE
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  current_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  preferred_appointment_type appointment_type NOT NULL,
  preferred_dates DATERANGE[],
  preferred_times TEXT[],
  flexible_on_type BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  notified_count INTEGER DEFAULT 0,
  last_notified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_appointment_id UUID REFERENCES appointments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USER_ROLES TABLE
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'clinical_reviewer', 'readonly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- ============================================================================
-- PART 6: INDEXES
-- ============================================================================

-- Leads indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_phone ON leads(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_leads_risk_level ON leads(risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_leads_requires_review ON leads(requires_clinical_review) WHERE requires_clinical_review = TRUE;
CREATE INDEX idx_leads_last_activity ON leads(last_activity_at DESC);

-- Clinical interests indexes
CREATE INDEX idx_clinical_interests_lead_id ON clinical_interests(lead_id);
CREATE INDEX idx_clinical_interests_category ON clinical_interests(procedure_category);
CREATE INDEX idx_clinical_interests_procedure ON clinical_interests(specific_procedure);
CREATE INDEX idx_clinical_interests_revision ON clinical_interests(is_revision) WHERE is_revision = TRUE;

-- AI qualification logs indexes
CREATE INDEX idx_ai_qual_logs_lead_id ON ai_qual_logs(lead_id);
CREATE INDEX idx_ai_qual_logs_session_id ON ai_qual_logs(session_id);
CREATE INDEX idx_ai_qual_logs_created_at ON ai_qual_logs(created_at DESC);
CREATE INDEX idx_ai_qual_logs_intent ON ai_qual_logs(intent_detected);
CREATE INDEX idx_ai_qual_logs_escalated ON ai_qual_logs(escalated) WHERE escalated = TRUE;
CREATE INDEX idx_ai_qual_logs_unreviewed ON ai_qual_logs(human_reviewed) WHERE human_reviewed = FALSE;

-- Communication audit indexes
CREATE INDEX idx_comm_audit_lead_id ON communication_audit(lead_id);
CREATE INDEX idx_comm_audit_channel ON communication_audit(channel);
CREATE INDEX idx_comm_audit_created_at ON communication_audit(created_at DESC);
CREATE INDEX idx_comm_audit_recipient ON communication_audit(recipient_identifier);
CREATE INDEX idx_comm_audit_workflow ON communication_audit(workflow_execution_id);
CREATE INDEX idx_comm_audit_status ON communication_audit(delivery_status);

-- Chat sessions indexes
CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX idx_chat_sessions_lead_id ON chat_sessions(lead_id);
CREATE INDEX idx_chat_sessions_active ON chat_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);

-- Appointments indexes
CREATE INDEX idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_appointments_type ON appointments(appointment_type);
CREATE INDEX idx_appointments_google_event ON appointments(google_calendar_event_id) WHERE google_calendar_event_id IS NOT NULL;
CREATE INDEX idx_appointments_upcoming ON appointments(scheduled_at) WHERE status IN ('pending', 'confirmed', 'reminded') AND scheduled_at > NOW();
CREATE INDEX idx_appointments_needs_reminder ON appointments(scheduled_at) WHERE status IN ('pending', 'confirmed') AND patient_confirmed = FALSE;

-- Appointment reminders indexes
CREATE INDEX idx_reminders_appointment_id ON appointment_reminders(appointment_id);
CREATE INDEX idx_reminders_scheduled_for ON appointment_reminders(scheduled_for);
CREATE INDEX idx_reminders_pending ON appointment_reminders(scheduled_for) WHERE delivery_status = 'pending' AND sent_at IS NULL;

-- Availability blocks indexes
CREATE INDEX idx_availability_time_range ON availability_blocks USING GIST (tstzrange(start_time, end_time));
CREATE INDEX idx_availability_available ON availability_blocks(is_available, start_time) WHERE is_available = TRUE;

-- Waitlist indexes
CREATE INDEX idx_waitlist_lead_id ON waitlist(lead_id);
CREATE INDEX idx_waitlist_active ON waitlist(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_waitlist_type ON waitlist(preferred_appointment_type);

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- ============================================================================
-- PART 7: FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update last_activity_at on leads
CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads SET last_activity_at = NOW() WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER trigger_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_clinical_interests_updated_at BEFORE UPDATE ON clinical_interests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_comm_audit_updated_at BEFORE UPDATE ON communication_audit FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_availability_updated_at BEFORE UPDATE ON availability_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_waitlist_updated_at BEFORE UPDATE ON waitlist FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Lead activity triggers
CREATE TRIGGER trigger_clinical_interests_lead_activity AFTER INSERT OR UPDATE ON clinical_interests FOR EACH ROW EXECUTE FUNCTION update_lead_last_activity();
CREATE TRIGGER trigger_ai_qual_logs_lead_activity AFTER INSERT ON ai_qual_logs FOR EACH ROW EXECUTE FUNCTION update_lead_last_activity();

-- Chat session message count update
CREATE OR REPLACE FUNCTION update_chat_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET message_count = message_count + 1, last_message_at = NOW(), current_intent = NEW.intent_detected
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_qual_log_update_session AFTER INSERT ON ai_qual_logs FOR EACH ROW EXECUTE FUNCTION update_chat_session_on_message();

-- Lead status sync with appointment
CREATE OR REPLACE FUNCTION update_lead_on_appointment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE leads SET status = 'booked', last_activity_at = NOW()
    WHERE id = NEW.lead_id AND status NOT IN ('completed', 'no_show', 'archived');
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      UPDATE leads SET status = 'completed', last_activity_at = NOW() WHERE id = NEW.lead_id;
    ELSIF NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
      UPDATE leads SET status = 'no_show', last_activity_at = NOW() WHERE id = NEW.lead_id;
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      IF NOT EXISTS (SELECT 1 FROM appointments WHERE lead_id = NEW.lead_id AND id != NEW.id AND status IN ('pending', 'confirmed', 'reminded')) THEN
        UPDATE leads SET status = 'qualified', last_activity_at = NOW() WHERE id = NEW.lead_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_appointment_lead_sync AFTER INSERT OR UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_lead_on_appointment();

-- Auto-create appointment reminders
CREATE OR REPLACE FUNCTION create_appointment_reminders()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO appointment_reminders (appointment_id, reminder_type, channel, scheduled_for) VALUES
    (NEW.id, '48h', 'sms', NEW.scheduled_at - INTERVAL '48 hours'),
    (NEW.id, '24h', 'email', NEW.scheduled_at - INTERVAL '24 hours'),
    (NEW.id, '2h', 'sms', NEW.scheduled_at - INTERVAL '2 hours');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_appointment_reminders AFTER INSERT ON appointments FOR EACH ROW WHEN (NEW.status IN ('pending', 'confirmed')) EXECUTE FUNCTION create_appointment_reminders();

-- ============================================================================
-- PART 8: RLS HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = required_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.has_any_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ANY(required_roles));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_role('admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.is_staff_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_any_role(ARRAY['admin', 'staff', 'clinical_reviewer']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.is_clinical_reviewer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_any_role(ARRAY['admin', 'clinical_reviewer']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PART 9: ENABLE RLS
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
-- PART 10: RLS POLICIES
-- ============================================================================

-- LEADS POLICIES
CREATE POLICY leads_admin_all ON leads FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());
CREATE POLICY leads_staff_select ON leads FOR SELECT TO authenticated USING (auth.is_staff_or_above());
CREATE POLICY leads_staff_insert ON leads FOR INSERT TO authenticated WITH CHECK (auth.is_staff_or_above());
CREATE POLICY leads_staff_update ON leads FOR UPDATE TO authenticated USING (auth.is_staff_or_above() AND (auth.is_admin() OR assigned_to = auth.uid() OR assigned_to IS NULL)) WITH CHECK (auth.is_staff_or_above());
CREATE POLICY leads_readonly_select ON leads FOR SELECT TO authenticated USING (auth.has_role('readonly'));
CREATE POLICY leads_service_all ON leads FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- CLINICAL_INTERESTS POLICIES
CREATE POLICY clinical_interests_admin_all ON clinical_interests FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());
CREATE POLICY clinical_interests_staff_select ON clinical_interests FOR SELECT TO authenticated USING (auth.is_staff_or_above());
CREATE POLICY clinical_interests_staff_insert ON clinical_interests FOR INSERT TO authenticated WITH CHECK (auth.is_staff_or_above());
CREATE POLICY clinical_interests_staff_update ON clinical_interests FOR UPDATE TO authenticated USING (auth.is_staff_or_above()) WITH CHECK (auth.is_staff_or_above());
CREATE POLICY clinical_interests_service_all ON clinical_interests FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- AI_QUAL_LOGS POLICIES
CREATE POLICY ai_qual_logs_admin_all ON ai_qual_logs FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());
CREATE POLICY ai_qual_logs_staff_select ON ai_qual_logs FOR SELECT TO authenticated USING (auth.is_staff_or_above());
CREATE POLICY ai_qual_logs_reviewer_update ON ai_qual_logs FOR UPDATE TO authenticated USING (auth.is_clinical_reviewer()) WITH CHECK (auth.is_clinical_reviewer());
CREATE POLICY ai_qual_logs_service_all ON ai_qual_logs FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- COMMUNICATION_AUDIT POLICIES
CREATE POLICY comm_audit_admin_all ON communication_audit FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());
CREATE POLICY comm_audit_staff_select ON communication_audit FOR SELECT TO authenticated USING (auth.is_staff_or_above());
CREATE POLICY comm_audit_service_insert ON communication_audit FOR INSERT TO service_role WITH CHECK (TRUE);
CREATE POLICY comm_audit_service_select ON communication_audit FOR SELECT TO service_role USING (TRUE);

-- CHAT_SESSIONS POLICIES
CREATE POLICY chat_sessions_admin_all ON chat_sessions FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());
CREATE POLICY chat_sessions_staff_select ON chat_sessions FOR SELECT TO authenticated USING (auth.is_staff_or_above());
CREATE POLICY chat_sessions_staff_update ON chat_sessions FOR UPDATE TO authenticated USING (auth.is_staff_or_above()) WITH CHECK (auth.is_staff_or_above());
CREATE POLICY chat_sessions_service_all ON chat_sessions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- APPOINTMENTS POLICIES
CREATE POLICY appointments_admin_all ON appointments FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());
CREATE POLICY appointments_staff_all ON appointments FOR ALL TO authenticated USING (auth.is_staff_or_above()) WITH CHECK (auth.is_staff_or_above());
CREATE POLICY appointments_readonly_select ON appointments FOR SELECT TO authenticated USING (auth.has_role('readonly'));
CREATE POLICY appointments_service_all ON appointments FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- APPOINTMENT_REMINDERS POLICIES
CREATE POLICY reminders_admin_all ON appointment_reminders FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());
CREATE POLICY reminders_staff_select ON appointment_reminders FOR SELECT TO authenticated USING (auth.is_staff_or_above());
CREATE POLICY reminders_service_all ON appointment_reminders FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- AVAILABILITY_BLOCKS POLICIES
CREATE POLICY availability_admin_all ON availability_blocks FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());
CREATE POLICY availability_staff_select ON availability_blocks FOR SELECT TO authenticated USING (auth.is_staff_or_above());
CREATE POLICY availability_service_all ON availability_blocks FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY availability_anon_select ON availability_blocks FOR SELECT TO anon USING (is_available = TRUE);

-- WAITLIST POLICIES
CREATE POLICY waitlist_admin_all ON waitlist FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());
CREATE POLICY waitlist_staff_all ON waitlist FOR ALL TO authenticated USING (auth.is_staff_or_above()) WITH CHECK (auth.is_staff_or_above());
CREATE POLICY waitlist_service_all ON waitlist FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- USER_ROLES POLICIES
CREATE POLICY user_roles_admin_all ON user_roles FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());
CREATE POLICY user_roles_self_select ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- PART 11: HELPER FUNCTIONS FOR DASHBOARD
-- ============================================================================

-- Calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  lead_record RECORD;
  interest_count INTEGER;
  has_high_value_procedure BOOLEAN;
BEGIN
  SELECT * INTO lead_record FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF lead_record.email IS NOT NULL THEN score := score + 10; END IF;
  IF lead_record.phone IS NOT NULL THEN score := score + 15; END IF;
  IF lead_record.email_verified THEN score := score + 10; END IF;
  IF lead_record.phone_verified THEN score := score + 10; END IF;

  CASE lead_record.source
    WHEN 'referral' THEN score := score + 20;
    WHEN 'google_ads' THEN score := score + 15;
    WHEN 'website' THEN score := score + 10;
    WHEN 'instagram' THEN score := score + 8;
    WHEN 'realself' THEN score := score + 12;
    ELSE score := score + 5;
  END CASE;

  SELECT COUNT(*) INTO interest_count FROM clinical_interests WHERE lead_id = p_lead_id;
  score := score + LEAST(interest_count * 5, 20);

  SELECT EXISTS (SELECT 1 FROM clinical_interests ci WHERE ci.lead_id = p_lead_id
    AND ci.specific_procedure IN ('facelift', 'rhinoplasty', 'breast_augmentation', 'tummy_tuck', 'mommy_makeover', 'bbl'))
  INTO has_high_value_procedure;
  IF has_high_value_procedure THEN score := score + 15; END IF;

  CASE lead_record.status
    WHEN 'qualified' THEN score := score + 20;
    WHEN 'booked' THEN score := score + 30;
    WHEN 'contacted' THEN score := score + 10;
    ELSE score := score + 0;
  END CASE;

  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql STABLE;

-- Get available slots
CREATE OR REPLACE FUNCTION get_available_slots(start_date DATE, end_date DATE, slot_duration_minutes INTEGER DEFAULT 60, appointment_type_filter appointment_type DEFAULT 'virtual')
RETURNS TABLE (slot_start TIMESTAMPTZ, slot_end TIMESTAMPTZ, slot_date DATE, slot_time TIME) AS $$
DECLARE
  current_date DATE := start_date;
  day_start TIME := '09:00:00';
  day_end TIME := '17:00:00';
  slot_interval INTERVAL;
  current_slot TIMESTAMPTZ;
  slot_end_time TIMESTAMPTZ;
BEGIN
  slot_interval := (slot_duration_minutes || ' minutes')::INTERVAL;
  WHILE current_date <= end_date LOOP
    IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
      current_slot := current_date + day_start;
      WHILE (current_slot::TIME + slot_interval::TIME) <= day_end LOOP
        slot_end_time := current_slot + slot_interval;
        IF NOT EXISTS (SELECT 1 FROM availability_blocks ab WHERE ab.is_available = FALSE AND tstzrange(ab.start_time, ab.end_time) && tstzrange(current_slot, slot_end_time))
           AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.status IN ('pending', 'confirmed', 'reminded') AND tstzrange(a.scheduled_at, a.end_time) && tstzrange(current_slot, slot_end_time))
        THEN
          get_available_slots.slot_start := current_slot;
          get_available_slots.slot_end := slot_end_time;
          get_available_slots.slot_date := current_date;
          get_available_slots.slot_time := current_slot::TIME;
          RETURN NEXT;
        END IF;
        current_slot := current_slot + slot_interval;
      END LOOP;
    END IF;
    current_date := current_date + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check slot availability
CREATE OR REPLACE FUNCTION is_slot_available(check_time TIMESTAMPTZ, duration_minutes INTEGER DEFAULT 60)
RETURNS BOOLEAN AS $$
DECLARE
  slot_end TIMESTAMPTZ;
BEGIN
  slot_end := check_time + (duration_minutes || ' minutes')::INTERVAL;
  IF EXISTS (SELECT 1 FROM availability_blocks ab WHERE ab.is_available = FALSE AND tstzrange(ab.start_time, ab.end_time) && tstzrange(check_time, slot_end)) THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM appointments a WHERE a.status IN ('pending', 'confirmed', 'reminded') AND tstzrange(a.scheduled_at, a.end_time) && tstzrange(check_time, slot_end)) THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Log communication
CREATE OR REPLACE FUNCTION log_communication(p_lead_id UUID, p_channel comm_channel, p_direction comm_direction, p_recipient TEXT, p_sender TEXT, p_message TEXT, p_message_type TEXT DEFAULT NULL, p_external_id TEXT DEFAULT NULL, p_workflow_id TEXT DEFAULT NULL, p_workflow_execution_id TEXT DEFAULT NULL, p_triggered_by TEXT DEFAULT 'system')
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO communication_audit (lead_id, channel, direction, recipient_identifier, sender_identifier, message_body, message_type, external_message_id, workflow_id, workflow_execution_id, triggered_by, delivery_status)
  VALUES (p_lead_id, p_channel, p_direction, p_recipient, p_sender, p_message, p_message_type, p_external_id, p_workflow_id, p_workflow_execution_id, p_triggered_by, 'sent')
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get lead pipeline stats
CREATE OR REPLACE FUNCTION get_lead_pipeline_stats(start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days', end_date TIMESTAMPTZ DEFAULT NOW())
RETURNS TABLE (status lead_status, count BIGINT, percentage DECIMAL(5,2)) AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM leads WHERE created_at BETWEEN start_date AND end_date;
  RETURN QUERY
  SELECT l.status, COUNT(*)::BIGINT, ROUND((COUNT(*)::DECIMAL / NULLIF(total_count, 0) * 100), 2)
  FROM leads l WHERE l.created_at BETWEEN start_date AND end_date
  GROUP BY l.status
  ORDER BY CASE l.status WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'qualified' THEN 3 WHEN 'booked' THEN 4 WHEN 'completed' THEN 5 WHEN 'no_show' THEN 6 WHEN 'archived' THEN 7 WHEN 'disqualified' THEN 8 END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get speed-to-lead stats
CREATE OR REPLACE FUNCTION get_speed_to_lead_stats(start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE (avg_response_seconds DECIMAL(10,2), median_response_seconds DECIMAL(10,2), under_60_seconds_pct DECIMAL(5,2), under_5_minutes_pct DECIMAL(5,2), total_leads BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH response_times AS (
    SELECT EXTRACT(EPOCH FROM (first_contacted_at - created_at)) AS response_seconds
    FROM leads WHERE created_at >= start_date AND first_contacted_at IS NOT NULL
  )
  SELECT
    ROUND(AVG(response_seconds)::DECIMAL, 2),
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_seconds)::DECIMAL, 2),
    ROUND((COUNT(*) FILTER (WHERE response_seconds < 60)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2),
    ROUND((COUNT(*) FILTER (WHERE response_seconds < 300)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2),
    COUNT(*)::BIGINT
  FROM response_times;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- PART 12: VIEWS
-- ============================================================================

-- Active leads view
CREATE OR REPLACE VIEW v_active_leads AS
SELECT l.*, ci.procedure_category AS primary_procedure_category, ci.specific_procedure AS primary_procedure,
  a.scheduled_at AS next_appointment, a.appointment_type AS next_appointment_type,
  (SELECT COUNT(*) FROM communication_audit ca WHERE ca.lead_id = l.id) AS communication_count,
  (SELECT MAX(created_at) FROM ai_qual_logs aql WHERE aql.lead_id = l.id) AS last_ai_interaction
FROM leads l
LEFT JOIN LATERAL (SELECT procedure_category, specific_procedure FROM clinical_interests WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) ci ON TRUE
LEFT JOIN LATERAL (SELECT scheduled_at, appointment_type FROM appointments WHERE lead_id = l.id AND status IN ('pending', 'confirmed', 'reminded') AND scheduled_at > NOW() ORDER BY scheduled_at ASC LIMIT 1) a ON TRUE
WHERE l.status NOT IN ('archived', 'disqualified');

-- Leads pending review
CREATE OR REPLACE VIEW v_leads_pending_review AS
SELECT l.id, l.full_name, l.email, l.phone, l.risk_level, l.risk_flags, l.created_at,
  aql.input_message AS trigger_message, aql.risk_keywords_detected, aql.escalation_reason, aql.created_at AS escalated_at
FROM leads l
INNER JOIN ai_qual_logs aql ON aql.lead_id = l.id AND aql.escalated = TRUE
WHERE l.requires_clinical_review = TRUE AND l.clinical_review_completed_at IS NULL
ORDER BY l.created_at ASC;

-- Today's appointments
CREATE OR REPLACE VIEW v_todays_appointments AS
SELECT a.*, l.full_name AS patient_name, l.email AS patient_email, l.phone AS patient_phone, ci.specific_procedure AS procedure_interest
FROM appointments a
INNER JOIN leads l ON l.id = a.lead_id
LEFT JOIN LATERAL (SELECT specific_procedure FROM clinical_interests WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) ci ON TRUE
WHERE DATE(a.scheduled_at AT TIME ZONE 'America/Los_Angeles') = CURRENT_DATE
AND a.status IN ('pending', 'confirmed', 'reminded', 'checked_in')
ORDER BY a.scheduled_at ASC;

-- Pending reminders
CREATE OR REPLACE VIEW v_pending_reminders AS
SELECT ar.*, a.scheduled_at AS appointment_time, l.full_name AS patient_name, l.phone AS patient_phone, l.email AS patient_email
FROM appointment_reminders ar
INNER JOIN appointments a ON a.id = ar.appointment_id
INNER JOIN leads l ON l.id = a.lead_id
WHERE ar.delivery_status = 'pending' AND ar.sent_at IS NULL AND ar.scheduled_for <= NOW() + INTERVAL '5 minutes'
AND a.status IN ('pending', 'confirmed', 'reminded')
ORDER BY ar.scheduled_for ASC;

-- Grant view access
GRANT SELECT ON v_active_leads TO authenticated;
GRANT SELECT ON v_leads_pending_review TO authenticated;
GRANT SELECT ON v_todays_appointments TO authenticated;
GRANT SELECT ON v_pending_reminders TO service_role;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================

-- Add table comments
COMMENT ON TABLE leads IS 'Primary table for patient lead management in MiKO system';
COMMENT ON TABLE clinical_interests IS 'Tracks procedure interests and qualification status for each lead';
COMMENT ON TABLE ai_qual_logs IS 'Logs all AI qualification interactions for training and audit';
COMMENT ON TABLE communication_audit IS 'HIPAA-compliant audit trail of all patient communications';
COMMENT ON TABLE chat_sessions IS 'Tracks web chat sessions for conversation continuity';
COMMENT ON TABLE appointments IS 'All consultation and procedure appointments';
COMMENT ON TABLE appointment_reminders IS 'Scheduled reminders for appointments';
COMMENT ON TABLE availability_blocks IS 'Provider availability and blocked time slots';
COMMENT ON TABLE waitlist IS 'Patients waiting for earlier appointment slots';
COMMENT ON TABLE user_roles IS 'Application roles for RLS enforcement';
