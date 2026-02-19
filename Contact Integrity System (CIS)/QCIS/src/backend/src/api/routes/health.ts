import { Router, Request, Response } from 'express';
import { testConnection, getPool, getPoolStats } from '../../database/connection';
import { config } from '../../config';
import { testRedisConnection } from '../../events/redis';
import { getCacheStats } from '../../cache';
import { getMetricsText } from '../middleware/metrics';
import { generateOpenAPISpec } from '../openapi';

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
      "SELECT filename FROM schema_migrations ORDER BY applied_at DESC LIMIT 1"
    );
    checks.migrations = {
      ok: migResult.rows.length > 0,
      detail: migResult.rows[0]?.filename || 'none',
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

  // Pool statistics
  const poolStats = getPoolStats();
  checks.pool = {
    ok: poolStats.waiting === 0,
    detail: `total=${poolStats.total} idle=${poolStats.idle} waiting=${poolStats.waiting}`,
  };

  // Cache statistics
  const cacheStats = getCacheStats();
  checks.cache = {
    ok: true,
    detail: `hits=${cacheStats.hits} misses=${cacheStats.misses} size=${cacheStats.size}`,
  };

  const allReady = Object.values(checks).every((c) => c.ok);

  res.status(allReady ? 200 : 503).json({
    ready: allReady,
    timestamp: new Date().toISOString(),
    checks,
  });
});

// ─── Metrics (Prometheus) ──────────────────────────────────────

router.get('/metrics', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(getMetricsText());
});

// ─── API Documentation ─────────────────────────────────────────

router.get('/api-docs', (_req: Request, res: Response) => {
  const spec = generateOpenAPISpec();
  res.json(spec);
});

router.get('/api-docs/ui', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CIS API Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api/api-docs',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: 'StandaloneLayout'
      });
    };
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
