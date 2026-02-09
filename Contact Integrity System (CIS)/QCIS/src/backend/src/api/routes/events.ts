import { Router, Request, Response } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { eventSchema } from '../schemas';
import { generateId, nowISO } from '../../shared/utils';

const router = Router();

// POST /api/events — ingest domain events (mock Sidebase emitter)
router.post(
  '/',
  authenticateJWT,
  requireRole('trust_safety'),
  validate(eventSchema),
  async (req: Request, res: Response) => {
    try {
      const event = {
        id: req.body.id || generateId(),
        type: req.body.type,
        correlation_id: req.body.correlation_id || generateId(),
        timestamp: req.body.timestamp || nowISO(),
        version: req.body.version || 1,
        payload: req.body.payload,
      };

      // Event bus will be wired in Stage 2
      // For now, acknowledge receipt
      const { getEventBus } = await import('../../events/bus');
      const bus = getEventBus();
      await bus.emit(event);

      res.status(202).json({
        accepted: true,
        event_id: event.id,
        correlation_id: event.correlation_id,
      });
    } catch (error) {
      console.error('Event ingestion error:', error);
      res.status(500).json({ error: 'Failed to process event' });
    }
  }
);

export default router;
