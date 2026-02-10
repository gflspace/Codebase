import { Router, Request, Response } from 'express';
import { analyzeEvent } from '../../detection';
import { verifyHMAC, authenticateJWT, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { eventSchema } from '../schemas';
import { generateId, nowISO } from '../../shared/utils';
import { EventType } from '../../events/types';

const router = Router();

// POST /api/analyze-event — receives event, returns signal(s)
// Authenticated via HMAC (service-to-service) or JWT (admin)
router.post(
  '/',
  async (req: Request, res: Response, next) => {
    // Try HMAC first, fallback to JWT
    if (req.headers['x-hmac-signature']) {
      verifyHMAC(req, res, next);
    } else {
      authenticateJWT(req, res, () => {
        requirePermission('risk.view')(req, res, next);
      });
    }
  },
  validate(eventSchema),
  async (req: Request, res: Response) => {
    try {
      const event = {
        id: req.body.id || generateId(),
        type: req.body.type as EventType,
        correlation_id: req.body.correlation_id || generateId(),
        timestamp: req.body.timestamp || nowISO(),
        version: req.body.version || 1,
        payload: req.body.payload,
      };

      const result = await analyzeEvent(event);

      res.json({
        event_id: result.event_id,
        signals: result.signals,
        signal_count: result.signals.length,
        processing_time_ms: result.processing_time_ms,
      });
    } catch (error) {
      console.error('Analyze event error:', error);
      res.status(500).json({ error: 'Failed to analyze event' });
    }
  }
);

export default router;
