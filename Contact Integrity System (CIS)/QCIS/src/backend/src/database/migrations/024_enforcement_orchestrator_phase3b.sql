-- Phase 3B: Enforcement Orchestrator — New action types + evaluation log
-- Requires PG 12+ for ADD VALUE inside transactions

-- New enforcement action types (context-aware)
ALTER TYPE enforcement_action_type ADD VALUE IF NOT EXISTS 'booking_blocked';
ALTER TYPE enforcement_action_type ADD VALUE IF NOT EXISTS 'booking_flagged';
ALTER TYPE enforcement_action_type ADD VALUE IF NOT EXISTS 'payment_held';
ALTER TYPE enforcement_action_type ADD VALUE IF NOT EXISTS 'payment_blocked';
ALTER TYPE enforcement_action_type ADD VALUE IF NOT EXISTS 'provider_demoted';
ALTER TYPE enforcement_action_type ADD VALUE IF NOT EXISTS 'provider_suspended';
ALTER TYPE enforcement_action_type ADD VALUE IF NOT EXISTS 'message_throttled';
ALTER TYPE enforcement_action_type ADD VALUE IF NOT EXISTS 'admin_escalation';

-- Pre-transaction evaluation log (sync endpoint audit trail)
CREATE TABLE IF NOT EXISTS evaluation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  counterparty_id UUID REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  decision VARCHAR(10) NOT NULL,
  risk_score NUMERIC(5,2) NOT NULL,
  risk_tier VARCHAR(20) NOT NULL,
  reason TEXT,
  signals TEXT[] DEFAULT '{}',
  enforcement_id UUID REFERENCES enforcement_actions(id),
  evaluation_time_ms INTEGER NOT NULL,
  shadow_mode BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_log_user ON evaluation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_eval_log_decision ON evaluation_log(decision);
CREATE INDEX IF NOT EXISTS idx_eval_log_created ON evaluation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_eval_log_action_type ON evaluation_log(action_type);
