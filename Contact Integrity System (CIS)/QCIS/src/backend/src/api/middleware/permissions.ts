import { query } from '../../database/connection';

/**
 * Resolves the effective permissions for an admin user by merging
 * role-based default permissions with any per-admin overrides.
 */
export async function resolvePermissions(adminUserId: string, role: string): Promise<string[]> {
  // Get default permissions for role
  const roleResult = await query(
    'SELECT permission FROM role_permissions WHERE role = $1',
    [role]
  );
  const rolePerms = new Set(roleResult.rows.map((r: { permission: string }) => r.permission));

  // Get per-admin overrides
  const overrideResult = await query(
    'SELECT permission, granted FROM admin_permission_overrides WHERE admin_user_id = $1',
    [adminUserId]
  );

  for (const row of overrideResult.rows) {
    if (row.granted) {
      rolePerms.add(row.permission);
    } else {
      rolePerms.delete(row.permission);
    }
  }

  return Array.from(rolePerms);
}
