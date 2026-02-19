import { Router, Request, Response } from 'express';
import { query } from '../../database/connection';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { createMessageSchema, messageQuerySchema, uuidParam } from '../schemas';
import { generateId } from '../../shared/utils';
import { emitMessageCreated } from '../../events/emit';

const router = Router();

// GET /api/messages
router.get(
  '/',
  authenticateJWT,
  requirePermission('messages.view'),
  validateQuery(messageQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (req.query.sender_id) {
        conditions.push(`sender_id = $${paramIndex++}`);
        values.push(req.query.sender_id);
      }
      if (req.query.receiver_id) {
        conditions.push(`receiver_id = $${paramIndex++}`);
        values.push(req.query.receiver_id);
      }
      if (req.query.conversation_id) {
        conditions.push(`conversation_id = $${paramIndex++}`);
        values.push(req.query.conversation_id);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT id, sender_id, receiver_id, conversation_id, content, metadata, created_at, edited_at
         FROM messages ${where}
         ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM messages ${where}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('List messages error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/messages/:id
router.get(
  '/:id',
  authenticateJWT,
  requirePermission('messages.view'),
  validateParams(uuidParam),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        'SELECT id, sender_id, receiver_id, conversation_id, content, metadata, created_at, edited_at FROM messages WHERE id = $1',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Get message error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/messages
router.post(
  '/',
  authenticateJWT,
  requirePermission('messages.manage'),
  validate(createMessageSchema),
  async (req: Request, res: Response) => {
    try {
      const id = generateId();
      const { sender_id, receiver_id, conversation_id, content, metadata } = req.body;

      const result = await query(
        `INSERT INTO messages (id, sender_id, receiver_id, conversation_id, content, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, sender_id, receiver_id, conversation_id, content, metadata, created_at, edited_at`,
        [id, sender_id, receiver_id, conversation_id || null, content, JSON.stringify(metadata || {})]
      );

      const row = result.rows[0];
      res.status(201).json({ data: row });

      // Fire-and-forget: emit domain event to event bus
      emitMessageCreated({
        id: row.id,
        sender_id: row.sender_id,
        receiver_id: row.receiver_id,
        conversation_id: row.conversation_id,
        content: row.content,
        metadata: row.metadata,
      });
    } catch (error) {
      console.error('Create message error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
