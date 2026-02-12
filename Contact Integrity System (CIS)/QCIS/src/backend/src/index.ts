import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { testConnection, closePool } from './database/connection';
import { errorHandler, notFound } from './api/middleware/errorHandler';
import { registerDetectionConsumer } from './detection';
import { registerScoringConsumer } from './scoring';
import { registerEnforcementConsumer } from './enforcement';
import { registerBookingAnomalyConsumer } from './detection/consumers/booking-anomaly';
import { registerPaymentAnomalyConsumer } from './detection/consumers/payment-anomaly';
import { registerProviderBehaviorConsumer } from './detection/consumers/provider-behavior';
import { registerTemporalPatternConsumer } from './detection/consumers/temporal-pattern';
import { registerContactChangeConsumer } from './detection/consumers/contact-change';
import { registerLeakageConsumer } from './detection/consumers/leakage-tracking';
import { registerRelationshipConsumer } from './detection/consumers/relationship-tracking';
import { globalLimiter, aiLimiter, writeLimiter } from './api/middleware/rateLimit';
import { closeRedis, testRedisConnection } from './events/redis';
import { getEventBus } from './events/bus';
import { DurableEventBus } from './events/durable-bus';

// Route imports
import healthRoutes from './api/routes/health';
import authRoutes from './api/routes/auth';
import userRoutes from './api/routes/users';
import messageRoutes from './api/routes/messages';
import transactionRoutes from './api/routes/transactions';
import riskSignalRoutes from './api/routes/risk-signals';
import riskScoreRoutes from './api/routes/risk-scores';
import enforcementRoutes from './api/routes/enforcement-actions';
import auditLogRoutes from './api/routes/audit-logs';
import eventRoutes from './api/routes/events';
import alertRoutes from './api/routes/alerts';
import caseRoutes from './api/routes/cases';
import appealRoutes from './api/routes/appeals';
import analyzeRoutes from './api/routes/analyze';
import shadowRoutes from './api/routes/shadow';
import statsRoutes from './api/routes/stats';
import statsV2Routes from './api/routes/stats-v2';
import aiRoutes from './api/routes/ai';
import adminUserRoutes from './api/routes/admin-users';
import adminRoleRoutes from './api/routes/admin-roles';
import webhookRoutes from './api/routes/webhooks';
import ratingRoutes from './api/routes/ratings';
import intelligenceRoutes from './api/routes/intelligence';

const app = express();

// Global middleware
app.use(helmet());
app.use(cors({
  origin: [config.dashboardUrl, config.apiBaseUrl],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting (GAP-04)
app.use('/api', globalLimiter);
app.use('/api/ai', aiLimiter);
app.use('/api/users', writeLimiter);
app.use('/api/messages', writeLimiter);
app.use('/api/transactions', writeLimiter);
app.use('/api/events', writeLimiter);
app.use('/api/alerts', writeLimiter);
app.use('/api/cases', writeLimiter);
app.use('/api/appeals', writeLimiter);
app.use('/api/enforcement-actions', writeLimiter);
app.use('/api/admin', writeLimiter);
app.use('/api/webhooks', writeLimiter);
app.use('/api/ratings', writeLimiter);

// Root route
app.get('/', (_req, res) => {
  res.json({
    service: 'QwickServices Contact Integrity System',
    version: '0.1.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      docs: '/api',
    },
  });
});

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/risk-signals', riskSignalRoutes);
app.use('/api/risk-scores', riskScoreRoutes);
app.use('/api/enforcement-actions', enforcementRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/analyze-event', analyzeRoutes);
app.use('/api/shadow', shadowRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/stats/v2', statsV2Routes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/roles', adminRoleRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/intelligence', intelligenceRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// ─── Server lifecycle ─────────────────────────────────────────

let server: http.Server | null = null;
let isShuttingDown = false;

async function start(): Promise<void> {
  console.log('QwickServices CIS Backend starting...');
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Shadow Mode: ${config.shadowMode}`);
  console.log(`  Kill Switch: ${config.enforcementKillSwitch}`);

  const dbOk = await testConnection();
  if (dbOk) {
    console.log('  Database: connected');
  } else {
    console.warn('  Database: NOT connected — running in degraded mode');
  }

  // Redis connection (if durable bus configured)
  if (config.eventBusBackend === 'redis' && config.redis.url) {
    const redisOk = await testRedisConnection();
    if (redisOk) {
      console.log('  Redis: connected (durable event bus)');
    } else {
      console.warn('  Redis: NOT connected — falling back to in-memory bus');
    }
  } else {
    console.log('  Event bus: in-memory mode');
  }

  // Register event consumers (pipeline: detection → scoring → enforcement)
  registerDetectionConsumer();
  registerScoringConsumer();
  registerEnforcementConsumer();

  // Phase 2C — Detection expansion (5 new consumers)
  registerBookingAnomalyConsumer();
  registerPaymentAnomalyConsumer();
  registerProviderBehaviorConsumer();
  registerTemporalPatternConsumer();
  registerContactChangeConsumer();
  // Phase 3A — Intelligence layer consumers
  registerLeakageConsumer();
  registerRelationshipConsumer();
  console.log('  Event consumers: 10 registered (detection, scoring, enforcement + 5 Phase 2C detectors + 2 Phase 3A intelligence)');

  // Recover pending events from last crash (durable bus only)
  const bus = getEventBus();
  if (bus instanceof DurableEventBus) {
    const recovered = await bus.recoverPendingEvents();
    if (recovered > 0) {
      console.log(`  Recovered ${recovered} pending events from previous session`);
    }
  }

  server = app.listen(config.port, () => {
    console.log(`  API listening on port ${config.port}`);
    console.log(`  Health check: http://localhost:${config.port}/api/health`);
  });

  // Keep connections alive but let shutdown close them
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

// ─── Graceful shutdown (GAP-02) ──────────────────────────────

const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10);

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Shutdown] ${signal} received — starting graceful shutdown...`);
  const shutdownStart = Date.now();

  // 1. Stop accepting new connections
  if (server) {
    await new Promise<void>((resolve) => {
      server!.close(() => {
        console.log(`[Shutdown] HTTP server closed (${Date.now() - shutdownStart}ms)`);
        resolve();
      });

      // Force-close after timeout
      setTimeout(() => {
        console.warn(`[Shutdown] Forcing server close after ${SHUTDOWN_TIMEOUT_MS}ms timeout`);
        resolve();
      }, SHUTDOWN_TIMEOUT_MS);
    });
  }

  // 2. Close Redis connection (if durable bus is active)
  try {
    await closeRedis();
    console.log(`[Shutdown] Redis closed (${Date.now() - shutdownStart}ms)`);
  } catch {
    // Redis may not be configured — non-critical
  }

  // 3. Close database pool (drains active queries)
  try {
    await closePool();
    console.log(`[Shutdown] Database pool closed (${Date.now() - shutdownStart}ms)`);
  } catch (err) {
    console.error('[Shutdown] Error closing database pool:', err);
  }

  console.log(`[Shutdown] Complete in ${Date.now() - shutdownStart}ms`);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, server, isShuttingDown };
