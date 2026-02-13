-- Migration 026: Admin Rules Engine (Layer 9)
-- Runtime-configurable detection, scoring, enforcement, and alerting rules.
-- Rules are versioned, auditable, and dry-runnable.

-- ─── detection_rules ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL,  -- enforcement_trigger, alert_threshold, scoring_adjustment, detection
  trigger_event_types TEXT[] NOT NULL,  -- which EventType values activate this rule
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  priority INTEGER DEFAULT 100,  -- lower = evaluated first
  enabled BOOLEAN DEFAULT TRUE,
  dry_run BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES admin_users(id),
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES detection_rules(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rules_enabled ON detection_rules(enabled, priority) WHERE enabled = true;
CREATE INDEX idx_rules_type ON detection_rules(rule_type);
CREATE INDEX idx_rules_version ON detection_rules(previous_version_id);

-- ─── rule_match_log ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rule_match_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES detection_rules(id),
  user_id UUID NOT NULL,
  event_type VARCHAR(100),
  matched BOOLEAN NOT NULL,
  dry_run BOOLEAN DEFAULT FALSE,
  context_snapshot JSONB,          -- the context evaluated against
  actions_executed JSONB,          -- what actions were taken (or would have been)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rule_match_rule ON rule_match_log(rule_id, created_at DESC);
CREATE INDEX idx_rule_match_user ON rule_match_log(user_id, created_at DESC);

-- ─── Trigger for updated_at ───────────────────────────────────

CREATE TRIGGER trg_detection_rules_updated_at
    BEFORE UPDATE ON detection_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Permissions ──────────────────────────────────────────────

INSERT INTO permissions (key, label, description, category, is_critical)
VALUES
  ('rules.view', 'View Rules', 'View detection and enforcement rules', 'Rules Engine', FALSE),
  ('rules.manage', 'Manage Rules', 'Create, update, and delete detection rules', 'Rules Engine', TRUE)
ON CONFLICT (key) DO NOTHING;

-- Grant rules permissions to appropriate roles
INSERT INTO role_permissions (role, permission)
VALUES
  ('super_admin', 'rules.view'),
  ('super_admin', 'rules.manage'),
  ('trust_safety', 'rules.view'),
  ('trust_safety', 'rules.manage'),
  ('risk_intelligence', 'rules.view')
ON CONFLICT (role, permission) DO NOTHING;
