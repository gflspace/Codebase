-- Migration 038: Add write-operation permissions
-- Adds granular manage/create permissions for routes that previously
-- incorrectly shared read-only (.view) permissions for write ops.

BEGIN;

INSERT INTO permissions (key, label, description, category, is_critical) VALUES
  ('appeals.create',        'Create Appeals',           'Submit new appeal requests',                                    'Appeals',       false),
  ('messages.manage',       'Manage Messages',          'Create and manage platform messages',                           'Messages',      false),
  ('risk.manage',           'Manage Risk Data',         'Create and manage risk signals and scores',                     'Risk',          true),
  ('transactions.manage',   'Manage Transactions',      'Create and update transaction records',                         'Transactions',  false),
  ('users.manage',          'Manage Users',             'Create and update user records',                                'Users',         true),
  ('ratings.manage',        'Manage Ratings',           'Create and manage rating submissions',                          'Ratings',       false),
  ('sync.view',             'View Sync Status',         'View data sync status and health reports',                      'Sync',          false),
  ('sync.manage',           'Manage Sync',              'Trigger syncs, toggle tables, reset watermarks',                'Sync',          true),
  ('rules.manage',          'Manage Detection Rules',   'Create, update, and delete detection rules',                    'Rules',         true)
ON CONFLICT (key) DO NOTHING;

-- super_admin: grant all new permissions
INSERT INTO role_permissions (role, permission)
  SELECT 'super_admin', key FROM permissions
  WHERE key IN ('appeals.create', 'messages.manage', 'risk.manage', 'transactions.manage', 'users.manage', 'ratings.manage', 'sync.view', 'sync.manage', 'rules.manage')
ON CONFLICT DO NOTHING;

-- trust_safety: can create appeals, manage messages, manage risk
INSERT INTO role_permissions (role, permission) VALUES
  ('trust_safety', 'appeals.create'),
  ('trust_safety', 'messages.manage'),
  ('trust_safety', 'risk.manage'),
  ('trust_safety', 'ratings.manage')
ON CONFLICT DO NOTHING;

-- trust_safety_analyst: can create appeals
INSERT INTO role_permissions (role, permission) VALUES
  ('trust_safety_analyst', 'appeals.create'),
  ('trust_safety_analyst', 'messages.manage')
ON CONFLICT DO NOTHING;

-- enforcement_officer: can create appeals (on behalf of users)
INSERT INTO role_permissions (role, permission) VALUES
  ('enforcement_officer', 'appeals.create')
ON CONFLICT DO NOTHING;

-- ops: can manage transactions, view sync
INSERT INTO role_permissions (role, permission) VALUES
  ('ops', 'transactions.manage'),
  ('ops', 'sync.view'),
  ('ops', 'sync.manage')
ON CONFLICT DO NOTHING;

-- risk_intelligence: can manage risk data
INSERT INTO role_permissions (role, permission) VALUES
  ('risk_intelligence', 'risk.manage')
ON CONFLICT DO NOTHING;

COMMIT;
