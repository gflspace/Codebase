-- Migration 025: Alerting Engine — Layer 8
-- Extends alerts table with source, SLA deadlines, escalation tracking.
-- Creates alert_subscriptions for notification routing.

-- Extend alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'enforcement';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS parent_alert_id UUID REFERENCES alerts(id);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS escalation_count INTEGER DEFAULT 0;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_alerts_source ON alerts(source);
CREATE INDEX IF NOT EXISTS idx_alerts_sla ON alerts(sla_deadline) WHERE status IN ('open', 'assigned', 'in_progress');

-- Alert subscriptions table
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  filter_criteria JSONB NOT NULL DEFAULT '{}',
  channels TEXT[] NOT NULL DEFAULT '{dashboard}',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_subs_admin ON alert_subscriptions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_alert_subs_enabled ON alert_subscriptions(enabled) WHERE enabled = TRUE;

CREATE TRIGGER trg_alert_subscriptions_updated_at
    BEFORE UPDATE ON alert_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
