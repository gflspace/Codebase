// QwickServices CIS — Data Sync Admin API
// Admin endpoints for managing the QwickServices data sync service.
// Requires JWT auth + sync.view/sync.manage permissions.

import { Router, Request, Response } from 'express';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { getSyncStatus, getSyncRunHistory, runSyncCycle, toggleTableSync, resetWatermark } from '../../sync';
import { testExternalConnection } from '../../sync/connection';
import { checkSyncHealth } from '../../sync/health';
import { config } from '../../config';

const router = Router();

// ─── GET /api/sync/status — Overall sync status ─────────────

router.get('/status', authenticateJWT, requirePermission('sync.view'), async (_req: Request, res: Response) => {
  try {
    const status = await getSyncStatus();
    res.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to get sync status', details: message });
  }
});

// ─── GET /api/sync/history — Recent sync run log ────────────

router.get('/history', authenticateJWT, requirePermission('sync.view'), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 200);
    const history = await getSyncRunHistory(limit);
    res.json({ runs: history, total: history.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to get sync history', details: message });
  }
});

// ─── POST /api/sync/trigger — Manual sync trigger ───────────

router.post('/trigger', authenticateJWT, requirePermission('sync.manage'), async (req: Request, res: Response) => {
  try {
    if (!config.sync.enabled) {
      res.status(400).json({ error: 'Data sync is disabled. Set SYNC_ENABLED=true to enable.' });
      return;
    }

    const { table } = req.body as { table?: string };
    const results = await runSyncCycle(table || undefined);

    const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
    const totalEvents = results.reduce((sum, r) => sum + r.eventsEmitted, 0);

    res.json({
      message: `Sync completed: ${totalRecords} records processed, ${totalEvents} events emitted`,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Sync trigger failed', details: message });
  }
});

// ─── PUT /api/sync/tables/:table — Toggle table sync ────────

router.put('/tables/:table', authenticateJWT, requirePermission('sync.manage'), async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const { enabled } = req.body as { enabled?: boolean };

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Missing required field: enabled (boolean)' });
      return;
    }

    await toggleTableSync(table, enabled);
    res.json({ message: `Table ${table} sync ${enabled ? 'enabled' : 'disabled'}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to update table sync', details: message });
  }
});

// ─── POST /api/sync/tables/:table/reset — Reset watermark ───

router.post('/tables/:table/reset', authenticateJWT, requirePermission('sync.manage'), async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    await resetWatermark(table);
    res.json({ message: `Watermark reset for table ${table} — next sync will re-process all records` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to reset watermark', details: message });
  }
});

// ─── GET /api/sync/test-connection — Test external DB ────────

router.get('/test-connection', authenticateJWT, requirePermission('sync.manage'), async (_req: Request, res: Response) => {
  try {
    if (!config.sync.enabled) {
      res.json({ connected: false, reason: 'Sync is disabled' });
      return;
    }

    const connected = await testExternalConnection();
    res.json({
      connected,
      driver: config.sync.db.driver,
      host: config.sync.db.host,
      port: config.sync.db.port,
      database: config.sync.db.name,
      user: config.sync.db.user,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.json({ connected: false, error: message });
  }
});

// ─── GET /api/sync/health — Sync health report ───────────────

router.get('/health', authenticateJWT, requirePermission('sync.view'), async (_req: Request, res: Response) => {
  try {
    const report = await checkSyncHealth();
    res.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to get sync health report', details: message });
  }
});

export default router;
