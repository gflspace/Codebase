// QwickServices CIS — Real-time SSE Event Stream
// Bridges the internal EventBus to browser clients via Server-Sent Events.
// Auth via query param since EventSource doesn't support Authorization headers.

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { getEventBus } from '../../events/bus';
import { DomainEvent } from '../../events/types';

const router = Router();

// ─── GET /api/stream — SSE event stream ──────────────────────────

router.get('/', (req: Request, res: Response) => {
  // Auth via query param (EventSource API limitation)
  const token = req.query.token as string;
  if (!token) {
    res.status(401).json({ error: 'Token required (?token=...)' });
    return;
  }

  let decoded: { id: string; permissions?: string[] };
  try {
    decoded = jwt.verify(token, config.jwt.secret) as typeof decoded;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Check permission
  const perms = decoded.permissions || [];
  if (!perms.includes('intelligence.view') && !perms.includes('alerts.view')) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  // Optional event type filter (?events=message.created,booking.created)
  const filterParam = req.query.events as string | undefined;
  const eventFilter = filterParam ? filterParam.split(',').map((s) => s.trim()) : null;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  // Event listener
  const bus = getEventBus();
  const listener = (event: DomainEvent) => {
    if (eventFilter && !eventFilter.includes(event.type)) return;

    const payload = JSON.stringify({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      correlation_id: event.correlation_id,
      payload: event.payload,
    });

    res.write(`event: ${event.type}\ndata: ${payload}\n\n`);
  };

  bus.on('*', listener);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    bus.off('*', listener);
  });
});

export default router;
