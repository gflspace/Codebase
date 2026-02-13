import { Router, Request, Response } from 'express';
import { testConnection, getPool } from '../../database/connection';
import { config } from '../../config';
import { testRedisConnection } from '../../events/redis';

const router = Router();

const startedAt = new Date().toISOString();

router.get('/health', async (_req: Request, res: Response) => {
  const dbOk = await testConnection();

  const checks: Record<string, string> = {
    database: dbOk ? 'connected' : 'disconnected',
    event_bus: config.eventBusBackend,
  };

  // Check Redis if configured
  if (config.eventBusBackend === 'redis' && config.redis.url) {
    const redisOk = await testRedisConnection();
    checks.redis = redisOk ? 'connected' : 'disconnected';
  }

  const allOk = dbOk;

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    started_at: startedAt,
    environment: config.nodeEnv,
    shadowMode: config.shadowMode,
    enforcementKillSwitch: config.enforcementKillSwitch,
    scoringModel: config.scoringModel,
    checks,
  });
});

router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { ok: boolean; latency_ms?: number; detail?: string }> = {};

  // Database check with latency
  const dbStart = Date.now();
  const dbOk = await testConnection();
  checks.database = { ok: dbOk, latency_ms: Date.now() - dbStart };

  // Migration version check
  try {
    const pool = getPool();
    const migResult = await pool.query(
      "SELECT name FROM migrations ORDER BY applied_at DESC LIMIT 1"
    );
    checks.migrations = {
      ok: migResult.rows.length > 0,
      detail: migResult.rows[0]?.name || 'none',
    };
  } catch {
    checks.migrations = { ok: false, detail: 'migrations table not found' };
  }

  // Redis check (if configured)
  if (config.eventBusBackend === 'redis' && config.redis.url) {
    const redisStart = Date.now();
    const redisOk = await testRedisConnection();
    checks.redis = { ok: redisOk, latency_ms: Date.now() - redisStart };
  }

  const allReady = Object.values(checks).every((c) => c.ok);

  res.status(allReady ? 200 : 503).json({
    ready: allReady,
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
