// QwickServices CIS — Cache Layer
// Thin cache abstraction using Redis when available, in-memory LRU fallback

import { getRedisClient, isRedisAvailable } from '../events/redis';

interface CacheOptions {
  ttlSeconds: number;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

// In-memory fallback cache
const memoryCache = new Map<string, CacheEntry>();
const MAX_MEMORY_ENTRIES = 1000;
const stats: CacheStats = { hits: 0, misses: 0, size: 0 };

// Periodic cleanup of expired entries
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (entry.expiresAt < now) {
        memoryCache.delete(key);
      }
    }
    stats.size = memoryCache.size;
  }, 60000); // Every 60 seconds
}

function evictOldest(): void {
  // Get oldest entry by iterating (Map preserves insertion order)
  const firstKey = memoryCache.keys().next().value;
  if (firstKey) {
    memoryCache.delete(firstKey);
  }
}

/**
 * Get value from cache.
 * Returns null if not found or expired.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    // Try Redis first
    if (isRedisAvailable()) {
      const redis = await getRedisClient();
      const value = await redis.get(`cis:cache:${key}`);
      if (value) {
        stats.hits++;
        return JSON.parse(value) as T;
      }
      stats.misses++;
      return null;
    }
  } catch (err) {
    // Redis failed, fall through to memory cache
    console.warn('[Cache] Redis get failed, falling back to memory:', err);
  }

  // In-memory fallback
  const entry = memoryCache.get(key);
  if (!entry) {
    stats.misses++;
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    stats.misses++;
    stats.size = memoryCache.size;
    return null;
  }

  stats.hits++;
  return entry.value as T;
}

/**
 * Set value in cache with TTL.
 */
export async function cacheSet(key: string, value: unknown, options: CacheOptions): Promise<void> {
  try {
    // Try Redis first
    if (isRedisAvailable()) {
      const redis = await getRedisClient();
      await redis.set(`cis:cache:${key}`, JSON.stringify(value), 'EX', options.ttlSeconds);
      return;
    }
  } catch (err) {
    // Redis failed, fall through to memory cache
    console.warn('[Cache] Redis set failed, falling back to memory:', err);
  }

  // In-memory fallback
  startCleanup();

  // Evict oldest if at capacity
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    evictOldest();
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + options.ttlSeconds * 1000,
  });
  stats.size = memoryCache.size;
}

/**
 * Delete a key from cache.
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    if (isRedisAvailable()) {
      const redis = await getRedisClient();
      await redis.del(`cis:cache:${key}`);
      return;
    }
  } catch (err) {
    console.warn('[Cache] Redis delete failed, falling back to memory:', err);
  }

  // In-memory fallback
  memoryCache.delete(key);
  stats.size = memoryCache.size;
}

/**
 * Delete all keys matching a pattern.
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    if (isRedisAvailable()) {
      const redis = await getRedisClient();
      const keys: string[] = [];
      let cursor = '0';

      // Use SCAN to find matching keys
      do {
        const [nextCursor, foundKeys] = await redis.scan(
          cursor,
          'MATCH',
          `cis:cache:${pattern}`,
          'COUNT',
          100
        );
        cursor = nextCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      // Delete in batches
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return;
    }
  } catch (err) {
    console.warn('[Cache] Redis deletePattern failed, falling back to memory:', err);
  }

  // In-memory fallback
  const keysToDelete: string[] = [];
  for (const key of memoryCache.keys()) {
    // Simple wildcard matching: * matches anything
    const regexPattern = pattern.replace(/\*/g, '.*');
    if (new RegExp(`^${regexPattern}$`).test(key)) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    memoryCache.delete(key);
  }
  stats.size = memoryCache.size;
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): CacheStats {
  return { ...stats };
}

/**
 * Clear all in-memory cache (for testing).
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
  stats.hits = 0;
  stats.misses = 0;
  stats.size = 0;
}
