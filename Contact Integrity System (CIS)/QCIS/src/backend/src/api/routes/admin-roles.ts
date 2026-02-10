import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';

const router = Router();

// GET /api/admin/roles — list all roles with their default permissions + all permission definitions
router.get(
  '/',
  authenticateJWT,
  requirePermission('settings.view'),
  async (_req: Request, res: Response) => {
    try {
      // Get all permissions
      const permResult = await query(
        'SELECT key, label, description, category, is_critical FROM permissions ORDER BY category, key'
      );

      // Get all role→permission mappings
      const rpResult = await query(
        'SELECT role, permission FROM role_permissions ORDER BY role, permission'
      );

      // Group role_permissions by role
      const roleMap: Record<string, string[]> = {};
      for (const row of rpResult.rows) {
        if (!roleMap[row.role]) roleMap[row.role] = [];
        roleMap[row.role].push(row.permission);
      }

      // Build roles array
      const roles = Object.entries(roleMap).map(([role, permissions]) => ({
        role,
        permissions,
      }));

      res.json({
        data: {
          roles,
          permissions: permResult.rows,
        },
      });
    } catch (error) {
      console.error('List admin roles error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
