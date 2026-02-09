import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { createAppealSchema, resolveAppealSchema, uuidParam, paginationQuery } from '../schemas';
import { generateId } from '../../shared/utils';

const router = Router();

// GET /api/appeals
router.get(
  '/',
  authenticateJWT,
  requireRole('trust_safety', 'legal_compliance'),
  validateQuery(paginationQuery),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const result = await query(
        `SELECT a.*, ea.action_type, ea.reason as enforcement_reason
         FROM appeals a
         JOIN enforcement_actions ea ON ea.id = a.enforcement_action_id
         ORDER BY a.submitted_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await query('SELECT COUNT(*) FROM appeals');
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

      const result = await query(
        `UPDATE appeals
         SET status = $1, resolution_notes = $2, resolved_by = $3, resolved_at = NOW()
         WHERE id = $4 AND status IN ('submitted', 'under_review')
         RETURNING *`,
        [status, resolution_notes, req.adminUser!.id, req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Appeal not found or already resolved' });
        return;
      }

      // If approved, reverse the enforcement action
      if (status === 'approved') {
        const appeal = result.rows[0];
        await query(
          `UPDATE enforcement_actions
           SET reversed_at = NOW(), reversed_by = $1, reversal_reason = $2
           WHERE id = $3`,
          [req.adminUser!.id, `Appeal approved: ${resolution_notes}`, appeal.enforcement_action_id]
        );
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Resolve appeal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
