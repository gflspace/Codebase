-- Phase 3A: Leakage funnel tracking table
-- Tracks progression: signal → attempt → confirmation → leakage

CREATE TABLE leakage_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    counterparty_id UUID REFERENCES users(id),
    stage VARCHAR(20) NOT NULL CHECK (stage IN ('signal', 'attempt', 'confirmation', 'leakage')),
    signal_ids UUID[] NOT NULL DEFAULT '{}',
    evidence JSONB NOT NULL DEFAULT '{}',
    platform_destination VARCHAR(100),
    estimated_revenue_loss NUMERIC(12,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leakage_user ON leakage_events(user_id);
CREATE INDEX idx_leakage_stage ON leakage_events(stage);
CREATE INDEX idx_leakage_destination ON leakage_events(platform_destination);
CREATE INDEX idx_leakage_user_counterparty ON leakage_events(user_id, counterparty_id, created_at DESC);
