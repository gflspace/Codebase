-- Phase 3A: Network graph edge storage
-- Canonical ordering: user_a_id < user_b_id enforced by CHECK constraint

CREATE TABLE user_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id UUID NOT NULL REFERENCES users(id),
    user_b_id UUID NOT NULL REFERENCES users(id),
    relationship_type VARCHAR(30) NOT NULL,
    interaction_count INTEGER DEFAULT 1,
    total_value NUMERIC(12,2) DEFAULT 0,
    first_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    strength_score NUMERIC(4,3) DEFAULT 0.000,
    risk_contribution NUMERIC(4,3) DEFAULT 0.000,
    CHECK (user_a_id < user_b_id),
    UNIQUE (user_a_id, user_b_id, relationship_type)
);

CREATE INDEX idx_relationships_a ON user_relationships(user_a_id);
CREATE INDEX idx_relationships_b ON user_relationships(user_b_id);
CREATE INDEX idx_relationships_type ON user_relationships(relationship_type);
CREATE INDEX idx_relationships_strength ON user_relationships(strength_score DESC);
