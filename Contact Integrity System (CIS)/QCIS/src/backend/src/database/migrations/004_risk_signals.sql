-- Migration 004: Risk Signals table
-- QwickServices CIS — Detection output: individual risk signals

CREATE TYPE signal_type AS ENUM (
    'CONTACT_PHONE', 'CONTACT_EMAIL', 'CONTACT_SOCIAL',
    'CONTACT_MESSAGING_APP', 'PAYMENT_EXTERNAL',
    'OFF_PLATFORM_INTENT', 'GROOMING_LANGUAGE',
    'TX_REDIRECT_ATTEMPT', 'TX_FAILURE_CORRELATED', 'TX_TIMING_ALIGNMENT'
);

CREATE TABLE risk_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_event_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    signal_type signal_type NOT NULL,
    confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    evidence JSONB NOT NULL DEFAULT '{}',
    obfuscation_flags TEXT[] NOT NULL DEFAULT '{}',
    pattern_flags TEXT[] NOT NULL DEFAULT '{}',
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_signals_event ON risk_signals(source_event_id);
CREATE INDEX idx_risk_signals_user ON risk_signals(user_id);
CREATE INDEX idx_risk_signals_type ON risk_signals(signal_type);
CREATE INDEX idx_risk_signals_confidence ON risk_signals(confidence);
CREATE INDEX idx_risk_signals_created_at ON risk_signals(created_at);
CREATE INDEX idx_risk_signals_processed ON risk_signals(processed) WHERE NOT processed;
CREATE INDEX idx_risk_signals_user_type ON risk_signals(user_id, signal_type, created_at);
