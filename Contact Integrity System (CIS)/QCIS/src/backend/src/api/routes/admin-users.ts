import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, transaction } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { resolvePermissions } from '../middleware/permissions';
import { validate, validateParams } from '../middleware/validation';
import { createAdminSchema, updateAdminSchema, resetPasswordSchema, uuidParam } from '../schemas';
import { generateId } from '../../shared/utils';

const router = Router();

// GET /api/admin/users — list all admins with resolved permissions
router.get(
  '/',
  authenticateJWT,
  requirePermission('settings.manage_admins'),
  async (_req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT id, email, name, role, active, force_password_change, last_login_at, last_login_ip, created_by, created_at, updated_at
         FROM admin_users ORDER BY created_at DESC`
      );

      // Resolve permissions for each admin
      const admins = await Promise.all(
        result.rows.map(async (row: Record<string, unknown>) => {
          const permissions = await resolvePermissions(row.id as string, row.role as string);
          return { ...row, permissions };
        })
      );

      // Count 30-day actions per admin
      const actionCounts = await query(
        `SELECT actor, COUNT(*) as action_count
         FROM audit_logs
         WHERE timestamp >= NOW() - INTERVAL '30 days' AND actor_type = 'admin'
         GROUP BY actor`
      );
      const actionMap = new Map(
        actionCounts.rows.map((r: { actor: string; action_count: string }) => [r.actor, parseInt(r.action_count)])
      );

      const data = admins.map((admin: Record<string, unknown>) => ({
        ...admin,
        action_count_30d: actionMap.get(admin.id as string) || 0,
      }));

      res.json({ data });
    } catch (error) {
      console.error('List admin users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admin/users/:id — single admin with overrides
router.get(
  '/:id',
  authenticateJWT,
  requirePermission('settings.manage_admins'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT id, email, name, role, active, force_password_change, last_login_at, last_login_ip, created_by, created_at, updated_at
         FROM admin_users WHERE id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Admin user not found' });
        return;
      }

      const admin = result.rows[0];
      const permissions = await resolvePermissions(admin.id, admin.role);

      const overrides = await query(
        'SELECT permission, granted FROM admin_permission_overrides WHERE admin_user_id = $1',
        [admin.id]
      );

      res.json({
        data: {
          ...admin,
          permissions,
          permission_overrides: overrides.rows,
        },
      });
    } catch (error) {
      console.error('Get admin user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/admin/users — create sub-admin
router.post(
  '/',
  authenticateJWT,
  requirePermission('settings.manage_admins'),
  validate(createAdminSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, name, password, role, force_password_change, permission_overrides } = req.body;

      // Prevent non-super_admin from creating super_admin
      if (role === 'super_admin' && req.adminUser!.role !== 'super_admin') {
        res.status(403).json({ error: 'Only super_admin can create super_admin accounts' });
        return;
      }

      // Check for existing email
      const existing = await query('SELECT id FROM admin_users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        res.status(409).json({ error: 'An admin with this email already exists' });
        return;
      }

      const id = generateId();
      const passwordHash = await bcrypt.hash(password, 12);

      const result = await transaction(async (client) => {
        const adminResult = await client.query(
          `INSERT INTO admin_users (id, email, name, password_hash, role, force_password_change, created_by)
           VALUES ($1, $2, $3, $4, $5::admin_role, $6, $7)
           RETURNING id, email, name, role, active, force_password_change, created_by, created_at`,
          [id, email, name, passwordHash, role, force_password_change ?? true, req.adminUser!.id]
        );

        // Write permission overrides
        if (permission_overrides && permission_overrides.length > 0) {
          for (const override of permission_overrides) {
            await client.query(
              `INSERT INTO admin_permission_overrides (admin_user_id, permission, granted)
               VALUES ($1, $2, $3)
               ON CONFLICT (admin_user_id, permission) DO UPDATE SET granted = $3`,
              [id, override.permission, override.granted]
            );
          }
        }

        // Audit log
        await client.query(
          `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details, ip_address)
           VALUES ($1, $2, 'admin', 'admin.user_created', 'admin_user', $3, $4, $5)`,
          [
            generateId(), req.adminUser!.id, id,
            JSON.stringify({ email, role, created_by: req.adminUser!.email }),
            req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
          ]
        );

        return adminResult.rows[0];
      });

      const permissions = await resolvePermissions(id, role);

      res.status(201).json({
        data: { ...result, permissions },
      });
    } catch (error) {
      console.error('Create admin user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/admin/users/:id — update role/name/active/overrides
router.patch(
  '/:id',
  authenticateJWT,
  requirePermission('settings.manage_admins'),
  validateParams(uuidParam),
  validate(updateAdminSchema),
  async (req: Request, res: Response) => {
    try {
      const targetId = req.params.id;
      const { name, role, active, permission_overrides } = req.body;

      // Prevent self-deactivation
      if (active === false && targetId === req.adminUser!.id) {
        res.status(400).json({ error: 'Cannot deactivate your own account' });
        return;
      }

      // Prevent non-super_admin from promoting to super_admin
      if (role === 'super_admin' && req.adminUser!.role !== 'super_admin') {
        res.status(403).json({ error: 'Only super_admin can promote to super_admin' });
        return;
      }

      const result = await transaction(async (client) => {
        // Build update fields
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
        if (role !== undefined) { updates.push(`role = $${paramIndex++}::admin_role`); values.push(role); }
        if (active !== undefined) { updates.push(`active = $${paramIndex++}`); values.push(active); }

        let adminRow;
        if (updates.length > 0) {
          values.push(targetId);
          const adminResult = await client.query(
            `UPDATE admin_users SET ${updates.join(', ')}, updated_at = NOW()
             WHERE id = $${paramIndex}
             RETURNING id, email, name, role, active, force_password_change, last_login_at, created_at, updated_at`,
            values
          );

          if (adminResult.rows.length === 0) {
            return null;
          }
          adminRow = adminResult.rows[0];
        } else {
          const existing = await client.query(
            'SELECT id, email, name, role, active, force_password_change, last_login_at, created_at, updated_at FROM admin_users WHERE id = $1',
            [targetId]
          );
          if (existing.rows.length === 0) return null;
          adminRow = existing.rows[0];
        }

        // Update permission overrides
        if (permission_overrides !== undefined) {
          await client.query('DELETE FROM admin_permission_overrides WHERE admin_user_id = $1', [targetId]);
          for (const override of permission_overrides) {
            await client.query(
              `INSERT INTO admin_permission_overrides (admin_user_id, permission, granted)
               VALUES ($1, $2, $3)`,
              [targetId, override.permission, override.granted]
            );
          }
        }

        // Audit log
        await client.query(
          `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details, ip_address)
           VALUES ($1, $2, 'admin', 'admin.user_updated', 'admin_user', $3, $4, $5)`,
          [
            generateId(), req.adminUser!.id, targetId,
            JSON.stringify({ changes: req.body, updated_by: req.adminUser!.email }),
            req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
          ]
        );

        return adminRow;
      });

      if (!result) {
        res.status(404).json({ error: 'Admin user not found' });
        return;
      }

      const permissions = await resolvePermissions(result.id, result.role);

      res.json({
        data: { ...result, permissions },
      });
    } catch (error) {
      console.error('Update admin user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/admin/users/:id/reset-password
router.post(
  '/:id/reset-password',
  authenticateJWT,
  requirePermission('settings.manage_admins'),
  validateParams(uuidParam),
  validate(resetPasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const { new_password } = req.body;
      const passwordHash = await bcrypt.hash(new_password, 12);

      const result = await transaction(async (client) => {
        const adminResult = await client.query(
          `UPDATE admin_users SET password_hash = $1, force_password_change = true, updated_at = NOW()
           WHERE id = $2
           RETURNING id, email, name`,
          [passwordHash, req.params.id]
        );

        if (adminResult.rows.length === 0) return null;

        await client.query(
          `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details, ip_address)
           VALUES ($1, $2, 'admin', 'admin.password_reset', 'admin_user', $3, $4, $5)`,
          [
            generateId(), req.adminUser!.id, req.params.id,
            JSON.stringify({ target_email: adminResult.rows[0].email, reset_by: req.adminUser!.email }),
            req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
          ]
        );

        return adminResult.rows[0];
      });

      if (!result) {
        res.status(404).json({ error: 'Admin user not found' });
        return;
      }

      res.json({ data: { message: 'Password reset successfully', admin: result } });
    } catch (error) {
      console.error('Reset admin password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
