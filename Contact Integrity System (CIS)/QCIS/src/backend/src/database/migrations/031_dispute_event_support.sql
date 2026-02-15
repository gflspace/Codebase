-- Migration 031: Dispute Event Support
-- Adds dispute_type column and index for status transitions.
-- The disputes table already exists from migration 028.

-- Add dispute_type to disputes table if missing
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS dispute_type VARCHAR(50) DEFAULT 'other';

-- Add index for dispute status transitions (used by correlation engine)
CREATE INDEX IF NOT EXISTS idx_disputes_status_created
  ON disputes (status, created_at DESC);

-- Add index for dispute lookups by user within time window
CREATE INDEX IF NOT EXISTS idx_disputes_user_created
  ON disputes (complainant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_disputes_respondent_created
  ON disputes (respondent_id, created_at DESC);
