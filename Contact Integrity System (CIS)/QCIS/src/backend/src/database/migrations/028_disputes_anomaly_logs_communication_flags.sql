-- Migration 028: disputes, anomaly_logs, communication_flags
-- QwickServices CIS — Additional intelligence tables for dispute tracking, anomaly detection, and communication monitoring

BEGIN;

-- ─── 1. Disputes table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  complainant_id UUID NOT NULL REFERENCES users(id),
  respondent_id UUID NOT NULL REFERENCES users(id),
  dispute_type VARCHAR(50) NOT NULL, -- quality, no_show, payment, safety, fraud, other
  status VARCHAR(30) NOT NULL DEFAULT 'open', -- open, investigating, resolved_for_complainant, resolved_for_respondent, dismissed
  description TEXT,
  evidence JSONB DEFAULT '{}',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES admin_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (dispute_type IN ('quality', 'no_show', 'payment', 'safety', 'fraud', 'other')),
  CHECK (status IN ('open', 'investigating', 'resolved_for_complainant', 'resolved_for_respondent', 'dismissed'))
);

CREATE INDEX idx_disputes_complainant ON disputes(complainant_id);
CREATE INDEX idx_disputes_respondent ON disputes(respondent_id);
CREATE INDEX idx_disputes_booking ON disputes(booking_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_resolved_by ON disputes(resolved_by);
CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);

CREATE TRIGGER trg_disputes_updated_at
    BEFORE UPDATE ON disputes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── 2. Anomaly logs table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS anomaly_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  anomaly_type VARCHAR(100) NOT NULL, -- score_spike, signal_burst, behavioral_shift, financial_anomaly, temporal_anomaly
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  metric_name VARCHAR(100) NOT NULL,
  expected_value NUMERIC(12,4),
  actual_value NUMERIC(12,4),
  deviation_sigma NUMERIC(6,3),
  context JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES admin_users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (anomaly_type IN ('score_spike', 'signal_burst', 'behavioral_shift', 'financial_anomaly', 'temporal_anomaly')),
  CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX idx_anomaly_user ON anomaly_logs(user_id, created_at DESC);
CREATE INDEX idx_anomaly_type ON anomaly_logs(anomaly_type);
CREATE INDEX idx_anomaly_severity ON anomaly_logs(severity);
CREATE INDEX idx_anomaly_unacked ON anomaly_logs(created_at DESC) WHERE NOT acknowledged;
CREATE INDEX idx_anomaly_metric ON anomaly_logs(metric_name);

-- ─── 3. Communication flags table ────────────────────────────────

CREATE TABLE IF NOT EXISTS communication_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id),
  user_id UUID NOT NULL REFERENCES users(id),
  flag_type VARCHAR(100) NOT NULL, -- contact_phone, contact_email, contact_social, obfuscation, grooming, off_platform_intent
  confidence NUMERIC(4,3) NOT NULL,
  extracted_value TEXT, -- the detected phone/email/handle
  context_snippet TEXT, -- surrounding text (redacted)
  false_positive BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES admin_users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (confidence >= 0 AND confidence <= 1),
  CHECK (flag_type IN ('contact_phone', 'contact_email', 'contact_social', 'obfuscation', 'grooming', 'off_platform_intent'))
);

CREATE INDEX idx_commflags_user ON communication_flags(user_id, created_at DESC);
CREATE INDEX idx_commflags_message ON communication_flags(message_id);
CREATE INDEX idx_commflags_type ON communication_flags(flag_type);
CREATE INDEX idx_commflags_unreviewed ON communication_flags(created_at DESC) WHERE reviewed_by IS NULL;
CREATE INDEX idx_commflags_confidence ON communication_flags(confidence DESC);

COMMIT;
