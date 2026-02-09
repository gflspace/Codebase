-- Migration 006: Enforcement Actions table
-- QwickServices CIS — Actions taken against users based on risk assessment

CREATE TYPE enforcement_action_type AS ENUM (
    'soft_warning', 'hard_warning', 'temporary_restriction',
    'account_suspension', 'permanent_ban'
);

CREATE TABLE enforcement_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type enforcement_action_type NOT NULL,
    reason TEXT NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    triggering_signal_ids UUID[] NOT NULL DEFAULT '{}',
    risk_score_id UUID REFERENCES risk_scores(id),
    effective_until TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    reversed_by UUID,
    reversal_reason TEXT,
    automated BOOLEAN NOT NULL DEFAULT TRUE,
    approved_by UUID,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enforcement_user ON enforcement_actions(user_id);
CREATE INDEX idx_enforcement_type ON enforcement_actions(action_type);
CREATE INDEX idx_enforcement_active ON enforcement_actions(user_id, effective_until)
    WHERE reversed_at IS NULL;
CREATE INDEX idx_enforcement_created_at ON enforcement_actions(created_at);
