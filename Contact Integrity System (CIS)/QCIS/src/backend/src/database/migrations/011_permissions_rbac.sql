-- Migration 011: Permission-Based RBAC & Sub-Admin Management
-- Adds granular permission system, role→permission mappings, admin overrides, and account security fields

BEGIN;

-- ─── 1. Extend admin_role enum with new values ──────────────────────

ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'trust_safety_analyst';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'enforcement_officer';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'risk_intelligence';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'ops_monitor';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'auditor';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'custom';

COMMIT;

-- Enum changes require their own transaction before use
BEGIN;

-- ─── 2. Permissions table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS permissions (
  key         VARCHAR(100) PRIMARY KEY,
  label       VARCHAR(255) NOT NULL,
  description TEXT,
  category    VARCHAR(100) NOT NULL,
  is_critical BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO permissions (key, label, description, category, is_critical) VALUES
  ('intelligence.view',     'View Intelligence Dashboard',     'Access KPI tiles, timeline charts, and intelligence metrics',     'Intelligence',  false),
  ('overview.view',         'View Overview',                   'Access aggregate stats and overview dashboard',                   'Overview',      false),
  ('category.view',         'View Categories',                 'Access service category breakdowns',                              'Overview',      false),
  ('alerts.view',           'View Alerts',                     'View alert inbox and alert details',                              'Alerts',        false),
  ('alerts.action',         'Action Alerts',                   'Update alert status, assign alerts, and take action',             'Alerts',        false),
  ('alerts.ai_summary',     'AI Risk Summary',                 'Generate AI-powered risk summaries for users',                    'AI',            false),
  ('cases.view',            'View Cases',                      'View case investigations and case details',                       'Cases',         false),
  ('cases.create',          'Create Cases',                    'Create new case investigations from alerts',                      'Cases',         false),
  ('cases.action',          'Action Cases',                    'Update case status, add notes, manage cases',                     'Cases',         false),
  ('enforcement.view',      'View Enforcement',                'View enforcement actions and their status',                       'Enforcement',   false),
  ('enforcement.reverse',   'Reverse Enforcement',             'Reverse active enforcement actions',                              'Enforcement',   true),
  ('appeals.view',          'View Appeals',                    'View appeal submissions and details',                             'Appeals',       false),
  ('appeals.resolve',       'Resolve Appeals',                 'Approve or deny appeal submissions',                              'Appeals',       true),
  ('appeals.ai_analysis',   'AI Appeal Analysis',              'Generate AI-powered appeal analysis',                             'AI',            false),
  ('risk.view',             'View Risk Data',                  'View risk signals, risk scores, and trends',                      'Risk',          false),
  ('risk.ai_patterns',      'AI Pattern Detection',            'Run AI pattern detection across risk data',                       'AI',            false),
  ('risk.ai_predictive',    'AI Predictive Alerts',            'Generate AI predictive alerts for users',                         'AI',            false),
  ('messages.view',         'View Messages',                   'View platform messages between users',                            'Messages',      false),
  ('audit_logs.view',       'View Audit Logs',                 'View system audit trail',                                         'Audit',         false),
  ('system_health.view',    'View System Health',              'View shadow mode status and pipeline metrics',                    'System',        false),
  ('settings.view',         'View Settings',                   'View admin settings and role reference',                          'Settings',      false),
  ('settings.manage_admins','Manage Admins',                   'Create, edit, and deactivate admin accounts',                     'Settings',      true),
  ('settings.manage_roles', 'Manage Roles',                    'Modify role-permission mappings',                                 'Settings',      true),
  ('events.ingest',         'Ingest Events',                   'Submit domain events to the event bus',                           'System',        false)
ON CONFLICT (key) DO NOTHING;

-- ─── 3. Role-permission junction table ───────────────────────────────

CREATE TABLE IF NOT EXISTS role_permissions (
  role        admin_role   NOT NULL,
  permission  VARCHAR(100) NOT NULL REFERENCES permissions(key),
  PRIMARY KEY (role, permission)
);

-- super_admin: all permissions
INSERT INTO role_permissions (role, permission)
  SELECT 'super_admin', key FROM permissions
ON CONFLICT DO NOTHING;

-- trust_safety (legacy): broad access
INSERT INTO role_permissions (role, permission) VALUES
  ('trust_safety', 'intelligence.view'),
  ('trust_safety', 'overview.view'),
  ('trust_safety', 'category.view'),
  ('trust_safety', 'alerts.view'),
  ('trust_safety', 'alerts.action'),
  ('trust_safety', 'alerts.ai_summary'),
  ('trust_safety', 'cases.view'),
  ('trust_safety', 'cases.create'),
  ('trust_safety', 'cases.action'),
  ('trust_safety', 'enforcement.view'),
  ('trust_safety', 'enforcement.reverse'),
  ('trust_safety', 'appeals.view'),
  ('trust_safety', 'appeals.resolve'),
  ('trust_safety', 'appeals.ai_analysis'),
  ('trust_safety', 'risk.view'),
  ('trust_safety', 'risk.ai_patterns'),
  ('trust_safety', 'risk.ai_predictive'),
  ('trust_safety', 'messages.view'),
  ('trust_safety', 'audit_logs.view'),
  ('trust_safety', 'system_health.view'),
  ('trust_safety', 'events.ingest')
ON CONFLICT DO NOTHING;

-- ops (legacy): monitoring + alerts, no enforcement/cases
INSERT INTO role_permissions (role, permission) VALUES
  ('ops', 'intelligence.view'),
  ('ops', 'overview.view'),
  ('ops', 'category.view'),
  ('ops', 'alerts.view'),
  ('ops', 'alerts.action'),
  ('ops', 'alerts.ai_summary'),
  ('ops', 'risk.view'),
  ('ops', 'risk.ai_patterns'),
  ('ops', 'risk.ai_predictive'),
  ('ops', 'system_health.view'),
  ('ops', 'events.ingest')
ON CONFLICT DO NOTHING;

-- legal_compliance (legacy): compliance, enforcement, appeals
INSERT INTO role_permissions (role, permission) VALUES
  ('legal_compliance', 'intelligence.view'),
  ('legal_compliance', 'overview.view'),
  ('legal_compliance', 'category.view'),
  ('legal_compliance', 'alerts.view'),
  ('legal_compliance', 'cases.view'),
  ('legal_compliance', 'cases.create'),
  ('legal_compliance', 'cases.action'),
  ('legal_compliance', 'enforcement.view'),
  ('legal_compliance', 'enforcement.reverse'),
  ('legal_compliance', 'appeals.view'),
  ('legal_compliance', 'appeals.resolve'),
  ('legal_compliance', 'appeals.ai_analysis'),
  ('legal_compliance', 'risk.view'),
  ('legal_compliance', 'messages.view'),
  ('legal_compliance', 'audit_logs.view')
ON CONFLICT DO NOTHING;

-- trust_safety_analyst: alerts + cases, no enforcement reversal
INSERT INTO role_permissions (role, permission) VALUES
  ('trust_safety_analyst', 'intelligence.view'),
  ('trust_safety_analyst', 'overview.view'),
  ('trust_safety_analyst', 'category.view'),
  ('trust_safety_analyst', 'alerts.view'),
  ('trust_safety_analyst', 'alerts.action'),
  ('trust_safety_analyst', 'alerts.ai_summary'),
  ('trust_safety_analyst', 'cases.view'),
  ('trust_safety_analyst', 'cases.create'),
  ('trust_safety_analyst', 'cases.action'),
  ('trust_safety_analyst', 'enforcement.view'),
  ('trust_safety_analyst', 'appeals.view'),
  ('trust_safety_analyst', 'risk.view'),
  ('trust_safety_analyst', 'risk.ai_patterns'),
  ('trust_safety_analyst', 'messages.view')
ON CONFLICT DO NOTHING;

-- enforcement_officer: enforcement actions + appeals
INSERT INTO role_permissions (role, permission) VALUES
  ('enforcement_officer', 'intelligence.view'),
  ('enforcement_officer', 'overview.view'),
  ('enforcement_officer', 'alerts.view'),
  ('enforcement_officer', 'enforcement.view'),
  ('enforcement_officer', 'enforcement.reverse'),
  ('enforcement_officer', 'appeals.view'),
  ('enforcement_officer', 'appeals.resolve'),
  ('enforcement_officer', 'risk.view'),
  ('enforcement_officer', 'audit_logs.view')
ON CONFLICT DO NOTHING;

-- risk_intelligence: risk + analytics focus
INSERT INTO role_permissions (role, permission) VALUES
  ('risk_intelligence', 'intelligence.view'),
  ('risk_intelligence', 'overview.view'),
  ('risk_intelligence', 'category.view'),
  ('risk_intelligence', 'alerts.view'),
  ('risk_intelligence', 'alerts.ai_summary'),
  ('risk_intelligence', 'risk.view'),
  ('risk_intelligence', 'risk.ai_patterns'),
  ('risk_intelligence', 'risk.ai_predictive'),
  ('risk_intelligence', 'messages.view')
ON CONFLICT DO NOTHING;

-- ops_monitor: read-only system health + overview
INSERT INTO role_permissions (role, permission) VALUES
  ('ops_monitor', 'intelligence.view'),
  ('ops_monitor', 'overview.view'),
  ('ops_monitor', 'category.view'),
  ('ops_monitor', 'alerts.view'),
  ('ops_monitor', 'risk.view'),
  ('ops_monitor', 'system_health.view')
ON CONFLICT DO NOTHING;

-- auditor: read-only audit logs + overview
INSERT INTO role_permissions (role, permission) VALUES
  ('auditor', 'intelligence.view'),
  ('auditor', 'overview.view'),
  ('auditor', 'risk.view'),
  ('auditor', 'audit_logs.view')
ON CONFLICT DO NOTHING;

-- custom: no default permissions (must be set via overrides)

-- ─── 4. Admin permission overrides table ─────────────────────────────

CREATE TABLE IF NOT EXISTS admin_permission_overrides (
  admin_user_id UUID         NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  permission    VARCHAR(100) NOT NULL REFERENCES permissions(key),
  granted       BOOLEAN      NOT NULL, -- true = grant, false = revoke
  PRIMARY KEY (admin_user_id, permission)
);

-- ─── 5. Add security columns to admin_users ──────────────────────────

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- ─── 6. Migrate existing trust_safety users to super_admin ──────────

UPDATE admin_users SET role = 'super_admin' WHERE role = 'trust_safety';

-- ─── 7. Indexes ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_admin_overrides_admin ON admin_permission_overrides(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(active) WHERE active = true;

COMMIT;
