-- Migration 014: Bookings table
-- QwickServices CIS — Service booking lifecycle (new blind-spot data)

CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'in_progress', 'completed',
    'cancelled', 'no_show', 'disputed'
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,
    client_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES users(id),
    service_category VARCHAR(100),
    amount NUMERIC(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    status booking_status NOT NULL DEFAULT 'pending',
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_scheduled ON bookings(scheduled_at);
CREATE INDEX idx_bookings_external ON bookings(external_id);

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
