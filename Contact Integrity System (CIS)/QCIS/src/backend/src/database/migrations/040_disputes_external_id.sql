-- Migration 040: Add external_id to disputes table for sync deduplication
-- Allows the domain-persistence consumer to UPSERT disputes from QwickServices

ALTER TABLE disputes ADD COLUMN IF NOT EXISTS external_id VARCHAR(255) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_disputes_external_id ON disputes(external_id);
