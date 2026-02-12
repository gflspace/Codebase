// QwickServices CIS — Redis Connection Manager
// Provides a shared Redis client for the durable event bus and DLQ.

import { config } from '../config';

let redisClient: import('ioredis').default | null = null;
let connectionFailed = false;

export async function getRedisClient(): Promise<import('ioredis').default> {
  if (redisClient) return redisClient;

  const Redis = (await import('ioredis')).default;

  redisClient = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 5) {
        connectionFailed = true;
        return null; // Stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redisClient.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  redisClient.on('connect', () => {
    connectionFailed = false;
    console.log('[Redis] Connected');
  });

  await redisClient.connect();
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export function isRedisAvailable(): boolean {
  return redisClient !== null && !connectionFailed && redisClient.status === 'ready';
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
