-- Migration 013: Webhook Events table
-- QwickServices CIS — Idempotent webhook receipt log for external platform ingestion

CREATE TYPE webhook_source AS ENUM ('qwickservices');
CREATE TYPE webhook_status AS ENUM ('received', 'processing', 'processed', 'failed');

CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_event_id VARCHAR(255) NOT NULL,
    source webhook_source NOT NULL DEFAULT 'qwickservices',
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status webhook_status NOT NULL DEFAULT 'received',
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    idempotency_key VARCHAR(255) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT uq_webhook_idempotency UNIQUE (source, idempotency_key)
);

CREATE INDEX idx_webhook_events_status_received ON webhook_events(status, received_at);
CREATE INDEX idx_webhook_events_source_type ON webhook_events(source, event_type);
CREATE INDEX idx_webhook_events_idempotency ON webhook_events(source, idempotency_key);
