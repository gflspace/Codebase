-- Migration 005: Risk Scores table
-- QwickServices CIS — Aggregated trust scores per user

CREATE TYPE risk_tier AS ENUM ('monitor', 'low', 'medium', 'high', 'critical');
CREATE TYPE trend_direction AS ENUM ('stable', 'escalating', 'decaying');

CREATE TABLE risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    tier risk_tier NOT NULL DEFAULT 'monitor',
    factors JSONB NOT NULL DEFAULT '{"operational": 0, "behavioral": 0, "network": 0}',
    trend trend_direction NOT NULL DEFAULT 'stable',
    signal_count INTEGER NOT NULL DEFAULT 0,
    last_signal_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_scores_user ON risk_scores(user_id);
CREATE INDEX idx_risk_scores_tier ON risk_scores(tier);
CREATE INDEX idx_risk_scores_score ON risk_scores(score);
CREATE INDEX idx_risk_scores_created_at ON risk_scores(created_at);
-- Get latest score per user efficiently
CREATE INDEX idx_risk_scores_user_latest ON risk_scores(user_id, created_at DESC);
