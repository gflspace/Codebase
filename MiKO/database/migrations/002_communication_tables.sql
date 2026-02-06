-- ============================================================================
-- MiKO Clinical Concierge System - Communication Tables
-- Migration: 002_communication_tables.sql
-- Description: Creates ai_qual_logs and communication_audit tables
-- ============================================================================

-- ============================================================================
-- ENUM TYPES FOR COMMUNICATION
-- ============================================================================

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

-- ============================================================================
-- AI_QUAL_LOGS TABLE
-- Logs all AI qualification interactions
-- ============================================================================

CREATE TABLE ai_qual_logs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- Chat session identifier

  -- Input data
  input_message TEXT NOT NULL,
  input_channel comm_channel NOT NULL DEFAULT 'web_chat',

  -- AI processing
  intent_detected ai_intent NOT NULL DEFAULT 'unknown',
  intent_confidence DECIMAL(5,4) CHECK (intent_confidence >= 0 AND intent_confidence <= 1),

  -- Risk detection
  risk_keywords_detected TEXT[] DEFAULT '{}',
  risk_score DECIMAL(5,2) DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  escalated BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,

  -- AI response
  ai_response TEXT NOT NULL,
  ai_action ai_action NOT NULL DEFAULT 'responded',
  suggested_actions JSONB DEFAULT '[]',

  -- Model metadata
  model_used TEXT DEFAULT 'gpt-4',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  response_time_ms INTEGER,

  -- Qualification outcome
  qualification_result JSONB, -- Structured qualification data
  procedure_identified TEXT,
  next_step TEXT,

  -- Quality tracking
  human_reviewed BOOLEAN DEFAULT FALSE,
  human_reviewer_id UUID REFERENCES auth.users(id),
  human_review_notes TEXT,
  response_quality_score INTEGER CHECK (response_quality_score >= 1 AND response_quality_score <= 5),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- ============================================================================
-- COMMUNICATION_AUDIT TABLE
-- HIPAA-compliant audit trail of all patient communications
-- ============================================================================

CREATE TABLE communication_audit (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  appointment_id UUID, -- Will reference appointments table

  -- Communication details
  channel comm_channel NOT NULL,
  direction comm_direction NOT NULL,

  -- Contact information (stored for audit even if lead deleted)
  recipient_identifier TEXT NOT NULL, -- Phone or email
  sender_identifier TEXT NOT NULL,

  -- Message content
  subject TEXT, -- For emails
  message_body TEXT NOT NULL,
  message_type TEXT, -- e.g., 'confirmation', 'reminder', 'follow_up', 'marketing'

  -- Delivery status
  delivery_status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
  delivery_timestamp TIMESTAMPTZ,
  delivery_error TEXT,

  -- External references
  external_message_id TEXT, -- Twilio SID, Gmail message ID, etc.
  external_provider TEXT, -- 'twilio', 'gmail', 'sendgrid', etc.

  -- Workflow tracking
  workflow_id TEXT, -- n8n workflow ID
  workflow_execution_id TEXT, -- n8n execution ID
  triggered_by TEXT, -- 'ai', 'staff', 'system', 'patient'

  -- Staff attribution
  sent_by_user_id UUID REFERENCES auth.users(id),

  -- HIPAA compliance
  contains_phi BOOLEAN DEFAULT TRUE,
  encryption_status TEXT DEFAULT 'encrypted',
  retention_category TEXT DEFAULT 'medical_record', -- Determines retention period

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CHAT_SESSIONS TABLE
-- Tracks web chat sessions for conversation continuity
-- ============================================================================

CREATE TABLE chat_sessions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,

  -- Association
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Session data
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,

  -- Conversation state
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  conversation_summary TEXT,
  current_intent ai_intent,

  -- Context
  context_data JSONB DEFAULT '{}', -- Stores conversation context for AI
  collected_data JSONB DEFAULT '{}', -- Data collected during conversation

  -- Attribution
  source_page TEXT,
  user_agent TEXT,
  ip_address INET,

  -- Handoff tracking
  handed_off_to_human BOOLEAN DEFAULT FALSE,
  handoff_reason TEXT,
  handled_by_user_id UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR COMMUNICATION TABLES
-- ============================================================================

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

-- ============================================================================
-- TRIGGERS FOR COMMUNICATION TABLES
-- ============================================================================

-- Trigger for ai_qual_logs to update lead last_activity
CREATE TRIGGER trigger_ai_qual_logs_lead_activity
  AFTER INSERT ON ai_qual_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_last_activity();

-- Trigger for communication_audit updated_at
CREATE TRIGGER trigger_comm_audit_updated_at
  BEFORE UPDATE ON communication_audit
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for chat_sessions updated_at
CREATE TRIGGER trigger_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update chat session message count
CREATE OR REPLACE FUNCTION update_chat_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET
    message_count = message_count + 1,
    last_message_at = NOW(),
    current_intent = NEW.intent_detected
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat session when AI log is created
CREATE TRIGGER trigger_ai_qual_log_update_session
  AFTER INSERT ON ai_qual_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_on_message();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ai_qual_logs IS 'Logs all AI qualification interactions for training and audit';
COMMENT ON TABLE communication_audit IS 'HIPAA-compliant audit trail of all patient communications';
COMMENT ON TABLE chat_sessions IS 'Tracks web chat sessions for conversation continuity';
COMMENT ON COLUMN ai_qual_logs.intent_confidence IS 'AI confidence in intent detection (0.0000-1.0000)';
COMMENT ON COLUMN ai_qual_logs.risk_score IS 'Calculated risk score based on keywords and context (0-100)';
COMMENT ON COLUMN communication_audit.contains_phi IS 'Indicates if message contains Protected Health Information';
COMMENT ON COLUMN communication_audit.retention_category IS 'Determines data retention period per HIPAA requirements';
