import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { auditLogQuerySchema } from '../schemas';

const router = Router();

// GET /api/audit-logs
router.get(
  '/',
  authenticateJWT,
  requirePermission('audit_logs.view'),
  validateQuery(auditLogQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.query.actor) {
        conditions.push(`actor = $${paramIndex++}`);
        values.push(req.query.actor);
      }
      if (req.query.action) {
        conditions.push(`action = $${paramIndex++}`);
        values.push(req.query.action);
      }
      if (req.query.entity_type) {
        conditions.push(`entity_type = $${paramIndex++}`);
        values.push(req.query.entity_type);
      }
      if (req.query.entity_id) {
        conditions.push(`entity_id = $${paramIndex++}`);
        values.push(req.query.entity_id);
      }
      if (req.query.from) {
        conditions.push(`timestamp >= $${paramIndex++}`);
        values.push(req.query.from);
      }
      if (req.query.to) {
        conditions.push(`timestamp <= $${paramIndex++}`);
        values.push(req.query.to);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT id, actor, actor_type, action, entity_type, entity_id, details, ip_address, timestamp
         FROM audit_logs ${where}
         ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM audit_logs ${where}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List audit logs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
