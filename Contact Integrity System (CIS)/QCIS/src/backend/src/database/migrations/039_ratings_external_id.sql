-- Migration 039: Add external_id to ratings table for sync deduplication
-- Allows the domain-persistence consumer to UPSERT ratings from QwickServices

ALTER TABLE ratings ADD COLUMN IF NOT EXISTS external_id VARCHAR(255) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_ratings_external_id ON ratings(external_id);
