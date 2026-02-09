-- Migration 001: Users table
-- QwickServices CIS — Core user identity and trust state

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_status AS ENUM ('active', 'restricted', 'suspended', 'banned');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,
    display_name VARCHAR(255),
    email VARCHAR(255),
    verification_status verification_status NOT NULL DEFAULT 'unverified',
    trust_score NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (trust_score >= 0 AND trust_score <= 100),
    status user_status NOT NULL DEFAULT 'active',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_trust_score ON users(trust_score);
CREATE INDEX idx_users_verification ON users(verification_status);
CREATE INDEX idx_users_external_id ON users(external_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
