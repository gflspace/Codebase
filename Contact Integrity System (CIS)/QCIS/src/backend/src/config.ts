import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function requiredInProduction(key: string, devFallback: string): string {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable in production: ${key}`);
    }
    console.warn(`[Config] WARNING: Using default ${key} — set in production!`);
    return devFallback;
  }
  return value;
}

export const config = {
  port: parseInt(optional('PORT', '3001'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  apiBaseUrl: optional('API_BASE_URL', 'http://localhost:3001'),

  db: {
    host: optional('DB_HOST', 'localhost'),
    port: parseInt(optional('DB_PORT', '5432'), 10),
    name: optional('DB_NAME', 'qwick_cis_dev'),
    user: optional('DB_USER', 'cis_app_user'),
    password: optional('DB_PASSWORD', 'changeme_dev_password'),
    ssl: optional('DB_SSL', 'false') === 'true',
  },

  jwt: {
    secret: requiredInProduction('JWT_SECRET', 'dev_jwt_secret_change_in_production'),
    expiresIn: optional('JWT_EXPIRES_IN', '24h'),
  },

  hmac: {
    secret: requiredInProduction('HMAC_SECRET', 'dev_hmac_secret_change_in_production'),
  },

  webhook: {
    secret: requiredInProduction('WEBHOOK_SECRET', 'dev_webhook_secret_change_in_production'),
    allowedSources: optional('WEBHOOK_ALLOWED_SOURCES', 'qwickservices').split(','),
  },

  shadowMode: optional('SHADOW_MODE', 'true') === 'true',
  enforcementKillSwitch: optional('ENFORCEMENT_KILL_SWITCH', 'false') === 'true',
  scoringModel: optional('SCORING_MODEL', '5-component') as '3-layer' | '5-component',

  logLevel: optional('LOG_LEVEL', 'debug'),
  dashboardUrl: optional('DASHBOARD_URL', 'http://localhost:3000'),

  openai: {
    apiKey: optional('OPENAI_API_KEY', ''),
    model: optional('OPENAI_MODEL', 'gpt-4o-mini'),
  },

  rateLimit: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10), // 1 minute
    max: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),              // 100 req/min global
    aiMax: parseInt(optional('RATE_LIMIT_AI_MAX', '10'), 10),          // 10 req/min AI endpoints
    writeMax: parseInt(optional('RATE_LIMIT_WRITE_MAX', '30'), 10),    // 30 req/min write endpoints
  },

  redis: {
    url: optional('REDIS_URL', ''),
  },

  eventBusBackend: optional('EVENT_BUS_BACKEND', 'memory') as 'memory' | 'redis',
} as const;
