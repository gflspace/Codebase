-- Migration 043: Intake form permissions
-- Grants intake.view and intake.manage to admin roles

BEGIN;

INSERT INTO permissions (key, label, description, category, is_critical)
VALUES
  ('intake.view', 'View Intake Forms', 'View submitted intake form entries', 'Intake', false),
  ('intake.manage', 'Manage Intake Forms', 'Update status and notes on intake forms', 'Intake', false)
ON CONFLICT (key) DO NOTHING;

-- Grant view to all admin roles, manage to admin + super_admin
INSERT INTO role_permissions (role, permission) VALUES
  ('super_admin', 'intake.view'),
  ('super_admin', 'intake.manage'),
  ('admin', 'intake.view'),
  ('admin', 'intake.manage'),
  ('analyst', 'intake.view'),
  ('ops', 'intake.view')
ON CONFLICT (role, permission) DO NOTHING;

INSERT INTO schema_migrations (filename, applied_at)
VALUES ('043_intake_permissions.sql', NOW());

COMMIT;
