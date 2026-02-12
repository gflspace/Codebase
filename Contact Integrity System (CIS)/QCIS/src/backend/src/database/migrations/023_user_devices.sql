-- Phase 3A: Device fingerprinting table
-- Tracks user devices for shared-device detection in network graph

CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    device_hash VARCHAR(64) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    os VARCHAR(50),
    browser VARCHAR(50),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    risk_flags TEXT[] DEFAULT '{}',
    UNIQUE (user_id, device_hash)
);

CREATE INDEX idx_devices_user ON user_devices(user_id);
CREATE INDEX idx_devices_hash ON user_devices(device_hash);
CREATE INDEX idx_devices_ip ON user_devices(ip_address);
