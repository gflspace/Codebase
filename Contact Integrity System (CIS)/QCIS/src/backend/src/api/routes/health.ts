import { Router, Request, Response } from 'express';
import { testConnection } from '../../database/connection';
import { config } from '../../config';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const dbOk = await testConnection();

  const status = {
    status: dbOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: config.nodeEnv,
    shadowMode: config.shadowMode,
    enforcementKillSwitch: config.enforcementKillSwitch,
    database: dbOk ? 'connected' : 'disconnected',
  };

  res.status(dbOk ? 200 : 503).json(status);
});

export default router;
