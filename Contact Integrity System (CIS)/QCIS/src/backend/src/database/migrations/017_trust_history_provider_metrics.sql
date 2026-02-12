-- Migration 017: Trust Score History & Provider Performance Metrics
-- QwickServices CIS — Historical trust scores + provider aggregate metrics

CREATE TABLE trust_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    score NUMERIC(5,2) NOT NULL,
    components JSONB NOT NULL DEFAULT '{}',
    source VARCHAR(50) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trust_history_user ON trust_score_history(user_id);
CREATE INDEX idx_trust_history_created ON trust_score_history(created_at);
CREATE INDEX idx_trust_history_user_created ON trust_score_history(user_id, created_at);

CREATE TABLE provider_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES users(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    bookings_total INTEGER DEFAULT 0,
    bookings_completed INTEGER DEFAULT 0,
    bookings_cancelled INTEGER DEFAULT 0,
    bookings_no_show INTEGER DEFAULT 0,
    avg_rating NUMERIC(3,2),
    complaints INTEGER DEFAULT 0,
    revenue_total NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_provider_period UNIQUE (provider_id, period_start, period_end)
);

CREATE INDEX idx_provider_metrics_provider ON provider_performance_metrics(provider_id);
CREATE INDEX idx_provider_metrics_period ON provider_performance_metrics(period_start, period_end);
