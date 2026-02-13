// QwickServices CIS — Alert Subscriptions API (Layer 8)
// CRUD endpoints for admin alert subscription management.

import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validation';
import { createSubscriptionSchema, updateSubscriptionSchema, uuidParam } from '../schemas';
import { generateId } from '../../shared/utils';

const router = Router();

// GET /api/alert-subscriptions — List subscriptions for current admin
router.get(
  '/',
  authenticateJWT,
  requirePermission('alerts.view'),
  async (req: Request, res: Response) => {
    try {
      const adminId = req.adminUser!.id;

      const result = await query(
        `SELECT id, admin_user_id, name, filter_criteria, channels, enabled, created_at, updated_at
         FROM alert_subscriptions
         WHERE admin_user_id = $1
         ORDER BY created_at DESC`,
        [adminId]
      );

      res.json({ data: result.rows });
    } catch (error) {
      console.error('List alert subscriptions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/alert-subscriptions — Create a new subscription
router.post(
  '/',
  authenticateJWT,
  requirePermission('alerts.action'),
  validate(createSubscriptionSchema),
  async (req: Request, res: Response) => {
    try {
      const adminId = req.adminUser!.id;
      const { name, filter_criteria, channels, enabled } = req.body;

      const id = generateId();

      const result = await query(
        `INSERT INTO alert_subscriptions (id, admin_user_id, name, filter_criteria, channels, enabled)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, adminId, name, JSON.stringify(filter_criteria), channels, enabled]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      console.error('Create alert subscription error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/alert-subscriptions/:id — Update a subscription
router.patch(
  '/:id',
  authenticateJWT,
  requirePermission('alerts.action'),
  validateParams(uuidParam),
  validate(updateSubscriptionSchema),
  async (req: Request, res: Response) => {
    try {
      const adminId = req.adminUser!.id;

      // Verify ownership
      const existing = await query(
        'SELECT id FROM alert_subscriptions WHERE id = $1 AND admin_user_id = $2',
        [req.params.id, adminId]
      );
      if (existing.rows.length === 0) {
        res.status(404).json({ error: 'Subscription not found' });
        return;
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.body.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(req.body.name);
      }
      if (req.body.filter_criteria !== undefined) {
        updates.push(`filter_criteria = $${paramIndex++}`);
        values.push(JSON.stringify(req.body.filter_criteria));
      }
      if (req.body.channels !== undefined) {
        updates.push(`channels = $${paramIndex++}`);
        values.push(req.body.channels);
      }
      if (req.body.enabled !== undefined) {
        updates.push(`enabled = $${paramIndex++}`);
        values.push(req.body.enabled);
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      values.push(req.params.id);
      const result = await query(
        `UPDATE alert_subscriptions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Update alert subscription error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/alert-subscriptions/:id — Delete a subscription
router.delete(
  '/:id',
  authenticateJWT,
  requirePermission('alerts.action'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const adminId = req.adminUser!.id;

      const result = await query(
        'DELETE FROM alert_subscriptions WHERE id = $1 AND admin_user_id = $2 RETURNING id',
        [req.params.id, adminId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Subscription not found' });
        return;
      }

      res.json({ data: { deleted: true, id: req.params.id } });
    } catch (error) {
      console.error('Delete alert subscription error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
