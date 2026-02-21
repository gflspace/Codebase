-- Migration 037: System User for Infrastructure Alerts
-- Schema drift detection and sync health monitor alerts require a valid
-- user_id FK (alerts.user_id → users.id). This inserts a well-known
-- system user so infrastructure alerts don't need a real human actor.

INSERT INTO users (id, email, display_name, user_type, status, trust_score, verification_status, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system@cis.internal',
  'System',
  'system',
  'active',
  100.00,
  'verified',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
