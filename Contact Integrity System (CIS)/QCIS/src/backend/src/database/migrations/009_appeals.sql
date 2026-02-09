-- Migration 009: Appeals table
-- QwickServices CIS — User appeals against enforcement actions

CREATE TYPE appeal_status AS ENUM ('submitted', 'under_review', 'approved', 'denied');

CREATE TABLE appeals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enforcement_action_id UUID NOT NULL REFERENCES enforcement_actions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status appeal_status NOT NULL DEFAULT 'submitted',
    reason TEXT NOT NULL,
    resolution_notes TEXT,
    resolved_by UUID,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_appeals_enforcement ON appeals(enforcement_action_id);
CREATE INDEX idx_appeals_user ON appeals(user_id);
CREATE INDEX idx_appeals_status ON appeals(status);
CREATE INDEX idx_appeals_submitted_at ON appeals(submitted_at);

-- ─── Admin Users table (for dashboard access) ───────────────

CREATE TYPE admin_role AS ENUM ('trust_safety', 'ops', 'legal_compliance');

CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role admin_role NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Event Deduplication table ──────────────────────────────

CREATE TABLE processed_events (
    event_id UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processed_events_at ON processed_events(processed_at);

-- ─── Row-Level Security ─────────────────────────────────────
-- Note: RLS policies are applied when connecting as restricted roles

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Messages: only accessible by trust_safety and legal roles
CREATE POLICY messages_trust_safety ON messages
    FOR SELECT
    USING (current_setting('app.user_role', true) IN ('trust_safety', 'legal_compliance', 'system'));

-- Risk signals: accessible by trust_safety and ops
CREATE POLICY risk_signals_access ON risk_signals
    FOR SELECT
    USING (current_setting('app.user_role', true) IN ('trust_safety', 'ops', 'legal_compliance', 'system'));

-- Audit logs: read-only for legal, full access for system
CREATE POLICY audit_logs_access ON audit_logs
    FOR SELECT
    USING (current_setting('app.user_role', true) IN ('legal_compliance', 'trust_safety', 'system'));
