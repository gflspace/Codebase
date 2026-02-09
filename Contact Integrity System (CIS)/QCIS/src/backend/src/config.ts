import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
    secret: optional('JWT_SECRET', 'dev_jwt_secret_change_in_production'),
    expiresIn: optional('JWT_EXPIRES_IN', '24h'),
  },

  hmac: {
    secret: optional('HMAC_SECRET', 'dev_hmac_secret_change_in_production'),
  },

  shadowMode: optional('SHADOW_MODE', 'true') === 'true',
  enforcementKillSwitch: optional('ENFORCEMENT_KILL_SWITCH', 'false') === 'true',

  logLevel: optional('LOG_LEVEL', 'debug'),
  dashboardUrl: optional('DASHBOARD_URL', 'http://localhost:3000'),
} as const;
