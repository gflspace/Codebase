import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { createCaseSchema, updateCaseSchema, addCaseNoteSchema, uuidParam, paginationQuery } from '../schemas';
import { generateId } from '../../shared/utils';

const router = Router();

// GET /api/cases
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
        `SELECT id, user_id, status, title, description, assigned_to, alert_ids, created_at, updated_at
         FROM cases ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await query('SELECT COUNT(*) FROM cases');
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List cases error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/cases/:id
router.get(
  '/:id',
  authenticateJWT,
  requireRole('trust_safety', 'legal_compliance'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const caseResult = await query('SELECT * FROM cases WHERE id = $1', [req.params.id]);

      if (caseResult.rows.length === 0) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      const notesResult = await query(
        'SELECT * FROM case_notes WHERE case_id = $1 ORDER BY created_at ASC',
        [req.params.id]
      );

      res.json({
        data: {
          ...caseResult.rows[0],
          notes: notesResult.rows,
        },
      });
    } catch (error) {
      console.error('Get case error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/cases
router.post(
  '/',
  authenticateJWT,
  requireRole('trust_safety'),
  validate(createCaseSchema),
  async (req: Request, res: Response) => {
    try {
      const id = generateId();
      const { user_id, title, description, alert_ids } = req.body;

      const result = await query(
        `INSERT INTO cases (id, user_id, title, description, alert_ids, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, user_id, title, description || null, alert_ids, req.adminUser!.id]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      console.error('Create case error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/cases/:id
router.patch(
  '/:id',
  authenticateJWT,
  requireRole('trust_safety'),
  validateParams(uuidParam),
  validate(updateCaseSchema),
  async (req: Request, res: Response) => {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(req.body)) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      values.push(req.params.id);
      const result = await query(
        `UPDATE cases SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Update case error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/cases/:id/notes
router.post(
  '/:id/notes',
  authenticateJWT,
  requireRole('trust_safety'),
  validateParams(uuidParam),
  validate(addCaseNoteSchema),
  async (req: Request, res: Response) => {
    try {
      const noteId = generateId();
      const result = await query(
        `INSERT INTO case_notes (id, case_id, author, content)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [noteId, req.params.id, req.adminUser!.email, req.body.content]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      console.error('Add case note error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
