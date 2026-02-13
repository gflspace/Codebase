// QwickServices CIS — Device Fingerprint Consumer Unit Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../src/database/connection', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../../src/config', () => ({
  config: {
    nodeEnv: 'test',
    logLevel: 'error',
  },
}));

import { extractDeviceInfo, parseUserAgent } from '../../src/detection/consumers/device-fingerprint';

beforeEach(() => { mockQuery.mockReset(); });

describe('extractDeviceInfo', () => {
  it('extracts device_hash from metadata', () => {
    const result = extractDeviceInfo({ metadata: { device_hash: 'abc123', ip_address: '1.2.3.4' } });
    expect(result.device_hash).toBe('abc123');
    expect(result.ip_address).toBe('1.2.3.4');
  });

  it('generates device_hash from user_agent when not provided', () => {
    const result = extractDeviceInfo({ metadata: { user_agent: 'Mozilla/5.0 Chrome', ip_address: '1.2.3.4' } });
    expect(result.device_hash).toBeTruthy();
    expect(result.device_hash!.length).toBe(64); // SHA-256 hex
  });

  it('returns null when no device info available', () => {
    const result = extractDeviceInfo({});
    expect(result.device_hash).toBeNull();
  });
});

describe('parseUserAgent', () => {
  it('parses Windows Chrome', () => {
    const result = parseUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120.0');
    expect(result.os).toBe('Windows');
    expect(result.browser).toBe('Chrome');
  });

  it('parses macOS Safari', () => {
    const result = parseUserAgent('Mozilla/5.0 (Macintosh) Safari/605.1');
    expect(result.os).toBe('macOS');
    expect(result.browser).toBe('Safari');
  });

  it('parses Android Firefox', () => {
    const result = parseUserAgent('Mozilla/5.0 (Android) Firefox/120.0');
    expect(result.os).toBe('Android');
    expect(result.browser).toBe('Firefox');
  });

  it('parses iOS Edge', () => {
    const result = parseUserAgent('Mozilla/5.0 (iPhone) Edg/120.0');
    expect(result.os).toBe('iOS');
    expect(result.browser).toBe('Edge');
  });

  it('returns nulls for empty input', () => {
    const result = parseUserAgent(null);
    expect(result.os).toBeNull();
    expect(result.browser).toBeNull();
  });
});
