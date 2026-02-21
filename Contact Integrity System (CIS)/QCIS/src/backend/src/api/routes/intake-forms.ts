import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validation';
import { intakeFormSchema, intakeFormQuerySchema, updateIntakeFormSchema } from '../schemas';
import { generateId } from '../../shared/utils';

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/intake-form — public endpoint, no auth required
router.post(
  '/',
  validate(intakeFormSchema),
  async (req: Request, res: Response) => {
    try {
      const id = generateId();
      const {
        first_name, last_name, email, phone,
        service_category, service_description,
        preferred_date, preferred_time,
        referral_source, metadata,
      } = req.body;

      // Capture request origin for fraud tracking
      const ip_address = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || null;
      const user_agent = req.headers['user-agent'] || null;

      const result = await query(
        `INSERT INTO intake_forms
           (id, first_name, last_name, email, phone, service_category, service_description,
            preferred_date, preferred_time, referral_source, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, first_name, last_name, email, service_category, status, created_at`,
        [
          id, first_name, last_name, email, phone || null,
          service_category || null, service_description || null,
          preferred_date || null, preferred_time || null,
          referral_source || null, ip_address, user_agent,
          metadata ? JSON.stringify(metadata) : '{}',
        ]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      console.error('Create intake form error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/intake-form — list intake forms (admin only)
router.get(
  '/',
  authenticateJWT,
  requirePermission('intake.view'),
  validateQuery(intakeFormQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.query.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(req.query.status);
      }
      if (req.query.email) {
        conditions.push(`email = $${paramIndex++}`);
        values.push(req.query.email);
      }
      if (req.query.service_category) {
        conditions.push(`service_category = $${paramIndex++}`);
        values.push(req.query.service_category);
      }
      if (req.query.from) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(req.query.from);
      }
      if (req.query.to) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(req.query.to);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT id, first_name, last_name, email, phone, service_category, service_description,
                preferred_date, preferred_time, referral_source, status, notes, created_at, updated_at
         FROM intake_forms ${where}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(`SELECT COUNT(*) FROM intake_forms ${where}`, values);
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List intake forms error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/intake-form/:id — get single form (admin only)
router.get(
  '/:id',
  authenticateJWT,
  requirePermission('intake.view'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!UUID_RE.test(id)) {
        res.status(400).json({ error: 'id must be a valid UUID' });
        return;
      }

      const result = await query(
        `SELECT id, first_name, last_name, email, phone, service_category, service_description,
                preferred_date, preferred_time, referral_source, ip_address, user_agent,
                metadata, status, notes, created_at, updated_at
         FROM intake_forms WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Intake form not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Get intake form error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/intake-form/:id — update status/notes (admin only)
router.patch(
  '/:id',
  authenticateJWT,
  requirePermission('intake.manage'),
  validate(updateIntakeFormSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!UUID_RE.test(id)) {
        res.status(400).json({ error: 'id must be a valid UUID' });
        return;
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.body.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(req.body.status);
      }
      if (req.body.notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        values.push(req.body.notes);
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      updates.push(`updated_at = NOW()`);

      const result = await query(
        `UPDATE intake_forms SET ${updates.join(', ')} WHERE id = $${paramIndex}
         RETURNING id, first_name, last_name, email, status, notes, updated_at`,
        [...values, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Intake form not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Update intake form error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
