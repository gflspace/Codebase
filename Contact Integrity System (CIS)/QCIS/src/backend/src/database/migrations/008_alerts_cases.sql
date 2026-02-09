-- Migration 008: Alerts and Cases tables
-- QwickServices CIS — Admin dashboard alert queue and case management

CREATE TYPE alert_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE alert_status AS ENUM ('open', 'assigned', 'in_progress', 'resolved', 'dismissed');
CREATE TYPE case_status AS ENUM ('open', 'investigating', 'pending_action', 'resolved', 'closed');

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    priority alert_priority NOT NULL DEFAULT 'medium',
    status alert_status NOT NULL DEFAULT 'open',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assigned_to UUID,
    risk_signal_ids UUID[] NOT NULL DEFAULT '{}',
    auto_generated BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_priority ON alerts(priority);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_assigned ON alerts(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_alerts_open ON alerts(priority, created_at) WHERE status = 'open';
CREATE INDEX idx_alerts_created_at ON alerts(created_at);

CREATE TRIGGER trg_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status case_status NOT NULL DEFAULT 'open',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assigned_to UUID,
    alert_ids UUID[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_user ON cases(user_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_assigned ON cases(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_cases_created_at ON cases(created_at);

CREATE TRIGGER trg_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE case_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    author VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_case_notes_case ON case_notes(case_id);
