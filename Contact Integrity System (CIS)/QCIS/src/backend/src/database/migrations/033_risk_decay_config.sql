-- Migration 033: Risk Decay Configuration
-- Enables time-based risk score decay when users have no new signals.
-- Configurable per risk tier with cooldown periods and minimum scores.

-- Add decay_applied_at to risk_scores for tracking when decay was last applied
ALTER TABLE risk_scores ADD COLUMN IF NOT EXISTS decay_applied_at TIMESTAMPTZ;

-- Configuration table for risk decay parameters
CREATE TABLE IF NOT EXISTS risk_decay_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(20) NOT NULL UNIQUE,
  decay_rate_per_day NUMERIC(5,4) NOT NULL DEFAULT 0.5,
  min_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  cooldown_days INTEGER NOT NULL DEFAULT 7,
  enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default decay configuration per tier
INSERT INTO risk_decay_config (tier, decay_rate_per_day, min_score, cooldown_days) VALUES
  ('low', 0.5, 0, 7),
  ('medium', 0.3, 20, 14),
  ('high', 0.2, 40, 30),
  ('critical', 0.1, 60, 60)
ON CONFLICT (tier) DO NOTHING;
