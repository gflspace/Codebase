import { Router, Request, Response } from 'express';
import { query, transaction } from '../../database/connection';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { createAppealSchema, resolveAppealSchema, uuidParam, appealQuerySchema } from '../schemas';
import { generateId } from '../../shared/utils';

const router = Router();

// GET /api/appeals
router.get(
  '/',
  authenticateJWT,
  requireRole('trust_safety', 'legal_compliance'),
  validateQuery(appealQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.query.status) {
        conditions.push(`a.status = $${paramIndex++}`);
        values.push(req.query.status);
      }
      if (req.query.category) {
        conditions.push(`u.service_category = $${paramIndex++}`);
        values.push(req.query.category);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT a.*, ea.action_type, ea.reason as enforcement_reason,
                u.display_name AS user_name, u.email AS user_email, u.phone AS user_phone, u.user_type, u.service_category, u.trust_score AS user_trust_score
         FROM appeals a
         JOIN enforcement_actions ea ON ea.id = a.enforcement_action_id
         LEFT JOIN users u ON u.id = a.user_id
         ${where}
         ORDER BY a.submitted_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM appeals a LEFT JOIN users u ON u.id = a.user_id ${where}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List appeals error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/appeals
router.post(
  '/',
  authenticateJWT,
  validate(createAppealSchema),
  async (req: Request, res: Response) => {
    try {
      const id = generateId();
      const { enforcement_action_id, user_id, reason } = req.body;

      // Verify the enforcement action exists and belongs to this user
      const actionResult = await query(
        'SELECT id FROM enforcement_actions WHERE id = $1 AND user_id = $2 AND reversed_at IS NULL',
        [enforcement_action_id, user_id]
      );

      if (actionResult.rows.length === 0) {
        res.status(404).json({ error: 'Enforcement action not found or already reversed' });
        return;
      }

      // Check for existing appeal
      const existingAppeal = await query(
        "SELECT id FROM appeals WHERE enforcement_action_id = $1 AND status IN ('submitted', 'under_review')",
        [enforcement_action_id]
      );

      if (existingAppeal.rows.length > 0) {
        res.status(409).json({ error: 'An appeal is already pending for this action' });
        return;
      }

      const result = await query(
        `INSERT INTO appeals (id, enforcement_action_id, user_id, reason)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, enforcement_action_id, user_id, reason]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      console.error('Create appeal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/appeals/:id/resolve
router.post(
  '/:id/resolve',
  authenticateJWT,
  requireRole('trust_safety', 'legal_compliance'),
  validateParams(uuidParam),
  validate(resolveAppealSchema),
  async (req: Request, res: Response) => {
    try {
      const { status, resolution_notes } = req.body;

      const result = await transaction(async (client) => {
        const appealResult = await client.query(
          `UPDATE appeals
           SET status = $1, resolution_notes = $2, resolved_by = $3, resolved_at = NOW()
           WHERE id = $4 AND status IN ('submitted', 'under_review')
           RETURNING *`,
          [status, resolution_notes, req.adminUser!.id, req.params.id]
        );

        if (appealResult.rows.length === 0) {
          return null;
        }

        const appeal = appealResult.rows[0];

        // If approved, reverse the enforcement action AND restore user status
        if (status === 'approved') {
          // Get the enforcement action to find the user_id
          const actionResult = await client.query(
            'SELECT user_id, action_type FROM enforcement_actions WHERE id = $1',
            [appeal.enforcement_action_id]
          );

          // Reverse the enforcement action
          await client.query(
            `UPDATE enforcement_actions
             SET reversed_at = NOW(), reversed_by = $1, reversal_reason = $2
             WHERE id = $3`,
            [req.adminUser!.id, `Appeal approved: ${resolution_notes}`, appeal.enforcement_action_id]
          );

          // Restore user status to 'active' if they were restricted/suspended
          if (actionResult.rows.length > 0) {
            const { user_id, action_type } = actionResult.rows[0];
            if (['temporary_restriction', 'account_suspension'].includes(action_type)) {
              await client.query(
                "UPDATE users SET status = 'active' WHERE id = $1 AND status IN ('restricted', 'suspended')",
                [user_id]
              );
            }
          }

          // Audit log for the reversal
          await client.query(
            `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              generateId(), req.adminUser!.id, 'admin', 'enforcement.reversed',
              'user', actionResult.rows[0]?.user_id || appeal.user_id,
              JSON.stringify({
                appeal_id: appeal.id,
                enforcement_action_id: appeal.enforcement_action_id,
                resolution_notes,
              }),
            ]
          );
        }

        return appeal;
      });

      if (!result) {
        res.status(404).json({ error: 'Appeal not found or already resolved' });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      console.error('Resolve appeal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
