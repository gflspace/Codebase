import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { testConnection } from './database/connection';
import { errorHandler, notFound } from './api/middleware/errorHandler';
import { registerDetectionConsumer } from './detection';
import { registerScoringConsumer } from './scoring';
import { registerEnforcementConsumer } from './enforcement';

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

const app = express();

// Global middleware
app.use(helmet());
app.use(cors({
  origin: [config.dashboardUrl, config.apiBaseUrl],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

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

// Error handling
app.use(notFound);
app.use(errorHandler);

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

  // Register event consumers (pipeline: detection → scoring → enforcement)
  registerDetectionConsumer();
  registerScoringConsumer();
  registerEnforcementConsumer();
  console.log('  Event consumers: detection, scoring, enforcement registered');

  app.listen(config.port, () => {
    console.log(`  API listening on port ${config.port}`);
    console.log(`  Health check: http://localhost:${config.port}/api/health`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app };
