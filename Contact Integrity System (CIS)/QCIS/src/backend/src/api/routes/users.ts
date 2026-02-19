import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { createUserSchema, updateUserSchema, uuidParam, userQuerySchema } from '../schemas';
import { generateId } from '../../shared/utils';
import { emitUserStatusChanged, emitContactFieldChanged } from '../../events/emit';

const router = Router();

// GET /api/users
router.get(
  '/',
  authenticateJWT,
  requirePermission('overview.view'),
  validateQuery(userQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.query.user_type) {
        conditions.push(`user_type = $${paramIndex++}`);
        values.push(req.query.user_type);
      }
      if (req.query.service_category) {
        conditions.push(`service_category = $${paramIndex++}`);
        values.push(req.query.service_category);
      }
      if (req.query.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(req.query.status);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT id, external_id, display_name, email, phone, user_type, service_category, verification_status, trust_score, status, metadata, created_at, updated_at
         FROM users ${where} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(`SELECT COUNT(*) FROM users ${where}`, values);
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/users/:id
router.get(
  '/:id',
  authenticateJWT,
  requirePermission('overview.view'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        'SELECT id, external_id, display_name, email, phone, user_type, service_category, verification_status, trust_score, status, metadata, created_at, updated_at FROM users WHERE id = $1',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/users
router.post(
  '/',
  authenticateJWT,
  requirePermission('users.manage'),
  validate(createUserSchema),
  async (req: Request, res: Response) => {
    try {
      const id = generateId();
      const { external_id, display_name, email, metadata } = req.body;

      const result = await query(
        `INSERT INTO users (id, external_id, display_name, email, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, external_id, display_name, email, verification_status, trust_score, status, metadata, created_at, updated_at`,
        [id, external_id || null, display_name || null, email || null, JSON.stringify(metadata || {})]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/users/:id
router.patch(
  '/:id',
  authenticateJWT,
  requirePermission('users.manage'),
  validateParams(uuidParam),
  validate(updateUserSchema),
  async (req: Request, res: Response) => {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(req.body)) {
        if (key === 'metadata') {
          updates.push(`metadata = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      // If status/phone/email is being changed, fetch previous values for events
      let previousStatus: string | undefined;
      let previousPhone: string | undefined;
      let previousEmail: string | undefined;
      if (req.body.status || req.body.phone || req.body.email) {
        const prev = await query('SELECT status, phone, email FROM users WHERE id = $1', [req.params.id]);
        if (prev.rows.length > 0) {
          previousStatus = prev.rows[0].status;
          previousPhone = prev.rows[0].phone;
          previousEmail = prev.rows[0].email;
        }
      }

      values.push(req.params.id);
      const result = await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
         RETURNING id, external_id, display_name, email, phone, verification_status, trust_score, status, metadata, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const row = result.rows[0];
      res.json({ data: row });

      // Fire-and-forget: emit status change event if status actually changed
      if (req.body.status && previousStatus && previousStatus !== row.status) {
        emitUserStatusChanged({
          id: row.id,
          previous_status: previousStatus,
          new_status: row.status,
          reason: req.body.reason,
        });
      }

      // Fire-and-forget: emit contact field change events
      if (req.body.phone && previousPhone !== req.body.phone) {
        emitContactFieldChanged({ user_id: row.id, field: 'phone', old_value: previousPhone, new_value: req.body.phone });
      }
      if (req.body.email && previousEmail !== req.body.email) {
        emitContactFieldChanged({ user_id: row.id, field: 'email', old_value: previousEmail, new_value: req.body.email });
      }
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
