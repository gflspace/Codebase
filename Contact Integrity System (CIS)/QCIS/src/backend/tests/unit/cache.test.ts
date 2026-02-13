// QwickServices CIS — Cache Layer Tests
// Tests in-memory fallback mode (Redis mocked as unavailable)

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock config (required by events/redis import chain)
vi.mock('../../src/config', () => ({
  config: {
    redis: { url: '' },
    logLevel: 'error',
  },
}));

// Mock Redis as unavailable
vi.mock('../../src/events/redis', () => ({
  getRedisClient: vi.fn().mockReturnValue(null),
  isRedisAvailable: () => false,
  testRedisConnection: () => Promise.resolve(false),
  closeRedis: vi.fn(),
}));

import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern, getCacheStats, clearMemoryCache } from '../../src/cache';

describe('Cache Layer (In-Memory Fallback)', () => {
  beforeEach(() => {
    clearMemoryCache();
  });

  it('cacheSet + cacheGet stores and retrieves values', async () => {
    await cacheSet('test:key1', { data: 'value1' }, { ttlSeconds: 60 });
    const result = await cacheGet<{ data: string }>('test:key1');
    expect(result).toEqual({ data: 'value1' });
  });

  it('cacheGet returns null for missing key', async () => {
    const result = await cacheGet<string>('test:missing');
    expect(result).toBeNull();
  });

  it('cacheGet returns null for expired key', async () => {
    // Set with 0 second TTL (will expire immediately)
    await cacheSet('test:expired', 'value', { ttlSeconds: 0 });

    // Wait 10ms to ensure expiration
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = await cacheGet<string>('test:expired');
    expect(result).toBeNull();
  });

  it('cacheDelete removes key', async () => {
    await cacheSet('test:key2', 'value2', { ttlSeconds: 60 });
    await cacheDelete('test:key2');

    const result = await cacheGet<string>('test:key2');
    expect(result).toBeNull();
  });

  it('cacheDeletePattern removes matching keys', async () => {
    await cacheSet('user:123', 'value1', { ttlSeconds: 60 });
    await cacheSet('user:456', 'value2', { ttlSeconds: 60 });
    await cacheSet('product:789', 'value3', { ttlSeconds: 60 });

    await cacheDeletePattern('user:*');

    const user1 = await cacheGet<string>('user:123');
    const user2 = await cacheGet<string>('user:456');
    const product = await cacheGet<string>('product:789');

    expect(user1).toBeNull();
    expect(user2).toBeNull();
    expect(product).toEqual('value3');
  });

  it('getCacheStats returns hit/miss counts', async () => {
    clearMemoryCache(); // Reset stats

    await cacheSet('test:key3', 'value3', { ttlSeconds: 60 });

    // Hit
    await cacheGet<string>('test:key3');

    // Miss
    await cacheGet<string>('test:missing1');
    await cacheGet<string>('test:missing2');

    const stats = getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(2);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('In-memory fallback works when Redis unavailable', async () => {
    // Redis is already mocked as unavailable
    await cacheSet('fallback:key', 'fallback-value', { ttlSeconds: 60 });
    const result = await cacheGet<string>('fallback:key');
    expect(result).toEqual('fallback-value');
  });

  it('Max 1000 entries enforced (oldest evicted)', async () => {
    // Fill cache to max capacity + 1
    for (let i = 0; i < 1001; i++) {
      await cacheSet(`key:${i}`, `value${i}`, { ttlSeconds: 60 });
    }

    const stats = getCacheStats();
    expect(stats.size).toBeLessThanOrEqual(1000);

    // First key should be evicted
    const first = await cacheGet<string>('key:0');
    expect(first).toBeNull();

    // Last key should still exist
    const last = await cacheGet<string>('key:1000');
    expect(last).toEqual('value1000');
  });

  it('TTL expiration works correctly', async () => {
    // Set with 100ms TTL
    await cacheSet('test:ttl', 'expires-soon', { ttlSeconds: 0.1 });

    // Should exist immediately
    const before = await cacheGet<string>('test:ttl');
    expect(before).toEqual('expires-soon');

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should be expired
    const after = await cacheGet<string>('test:ttl');
    expect(after).toBeNull();
  });

  it('Concurrent access does not corrupt state', async () => {
    const promises = [];

    // Concurrent writes
    for (let i = 0; i < 100; i++) {
      promises.push(cacheSet(`concurrent:${i}`, `value${i}`, { ttlSeconds: 60 }));
    }

    await Promise.all(promises);

    // Concurrent reads
    const readPromises = [];
    for (let i = 0; i < 100; i++) {
      readPromises.push(cacheGet<string>(`concurrent:${i}`));
    }

    const results = await Promise.all(readPromises);

    // Verify all values are correct
    for (let i = 0; i < 100; i++) {
      expect(results[i]).toEqual(`value${i}`);
    }
  });

  it('getCacheStats hit counter increments on cache hit', async () => {
    clearMemoryCache();

    await cacheSet('hit:test', 'value', { ttlSeconds: 60 });

    const statsBefore = getCacheStats();
    await cacheGet<string>('hit:test');
    const statsAfter = getCacheStats();

    expect(statsAfter.hits).toBe(statsBefore.hits + 1);
  });

  it('getCacheStats miss counter increments on cache miss', async () => {
    clearMemoryCache();

    const statsBefore = getCacheStats();
    await cacheGet<string>('miss:test');
    const statsAfter = getCacheStats();

    expect(statsAfter.misses).toBe(statsBefore.misses + 1);
  });
});
