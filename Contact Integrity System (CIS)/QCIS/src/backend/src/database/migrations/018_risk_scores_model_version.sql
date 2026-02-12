-- Migration 018: Add model_version column to risk_scores
-- QwickServices CIS — Phase 2B: 5-component scoring model support
-- Allows risk_scores rows to be tagged with the model that produced them.
-- The factors JSONB column already accepts any shape — old rows have
-- {"operational":X,"behavioral":Y,"network":Z}, new rows will have
-- the 5-component nested structure.

ALTER TABLE risk_scores ADD COLUMN IF NOT EXISTS model_version VARCHAR(10) DEFAULT '3-layer';
CREATE INDEX IF NOT EXISTS idx_risk_scores_model_version ON risk_scores(model_version);
