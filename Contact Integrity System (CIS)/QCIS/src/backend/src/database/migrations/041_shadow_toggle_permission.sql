-- Migration 041: Add shadow mode toggle permission
-- Allows super_admin to toggle shadow mode at runtime via API

INSERT INTO permissions (key, label, description, category, is_critical)
VALUES ('system.toggle_shadow', 'Toggle Shadow Mode', 'Enable or disable shadow mode at runtime', 'System', true)
ON CONFLICT (key) DO NOTHING;

-- Grant to super_admin (already gets all permissions via SELECT key FROM permissions,
-- but this explicit insert ensures it's available even if the role_permissions table
-- was populated before this migration)
INSERT INTO role_permissions (role, permission)
VALUES ('super_admin', 'system.toggle_shadow')
ON CONFLICT (role, permission) DO NOTHING;
