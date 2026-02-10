import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { createTransactionSchema, updateTransactionSchema, uuidParam, paginationQuery } from '../schemas';
import { generateId } from '../../shared/utils';
import { emitTransactionInitiated, emitTransactionStatusChanged } from '../../events/emit';

const router = Router();

// GET /api/transactions
router.get(
  '/',
  authenticateJWT,
  requirePermission('overview.view'),
  validateQuery(paginationQuery.extend({
    user_id: require('zod').z.string().uuid().optional(),
    status: require('zod').z.string().optional(),
  })),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.query.user_id) {
        conditions.push(`user_id = $${paramIndex++}`);
        values.push(req.query.user_id);
      }
      if (req.query.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(req.query.status);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT id, user_id, counterparty_id, amount, currency, status, payment_method, external_ref, metadata, created_at, updated_at
         FROM transactions ${where}
         ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM transactions ${where}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List transactions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/transactions/:id
router.get(
  '/:id',
  authenticateJWT,
  requirePermission('overview.view'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        'SELECT * FROM transactions WHERE id = $1',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/transactions
router.post(
  '/',
  authenticateJWT,
  requirePermission('overview.view'),
  validate(createTransactionSchema),
  async (req: Request, res: Response) => {
    try {
      const id = generateId();
      const { user_id, counterparty_id, amount, currency, payment_method, external_ref, metadata } = req.body;

      const result = await query(
        `INSERT INTO transactions (id, user_id, counterparty_id, amount, currency, payment_method, external_ref, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, user_id, counterparty_id || null, amount, currency || 'USD', payment_method || null, external_ref || null, JSON.stringify(metadata || {})]
      );

      const row = result.rows[0];
      res.status(201).json({ data: row });

      // Fire-and-forget: emit domain event to event bus
      emitTransactionInitiated({
        id: row.id,
        user_id: row.user_id,
        counterparty_id: row.counterparty_id,
        amount: row.amount,
        currency: row.currency,
        payment_method: row.payment_method,
        status: row.status,
      });
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/transactions/:id
router.patch(
  '/:id',
  authenticateJWT,
  requirePermission('overview.view'),
  validateParams(uuidParam),
  validate(updateTransactionSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        'UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *',
        [req.body.status, req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      const row = result.rows[0];
      res.json({ data: row });

      // Fire-and-forget: emit domain event to event bus
      emitTransactionStatusChanged({
        id: row.id,
        user_id: row.user_id,
        counterparty_id: row.counterparty_id,
        amount: row.amount,
        currency: row.currency,
        payment_method: row.payment_method,
        status: row.status,
      });
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
