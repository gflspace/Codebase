-- Phase 2D: Ratings table for individual reviews
-- Supports RATING_SUBMITTED event and provider rating manipulation detection

CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES users(id),
    booking_id UUID REFERENCES bookings(id),
    score SMALLINT NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratings_client ON ratings(client_id);
CREATE INDEX idx_ratings_provider ON ratings(provider_id);
CREATE INDEX idx_ratings_booking ON ratings(booking_id);
CREATE INDEX idx_ratings_provider_created ON ratings(provider_id, created_at);
CREATE INDEX idx_ratings_score ON ratings(score);
