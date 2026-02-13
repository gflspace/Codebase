import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, log } from '../../src/shared/logger';
import { config } from '../../src/config';

describe('Structured Logger', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleDebugSpy: any;
  let originalLogLevel: string;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    originalLogLevel = config.logLevel;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    (config as any).logLevel = originalLogLevel;
  });

  it('should create logger with all methods', () => {
    const logger = createLogger('test-component');

    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should output valid JSON', () => {
    const logger = createLogger('test');
    (config as any).logLevel = 'info';

    logger.info('Test message', { key: 'value' });

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const output = consoleInfoSpy.mock.calls[0][0];

    // Should be valid JSON
    expect(() => JSON.parse(output)).not.toThrow();

    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.component).toBe('test');
    expect(parsed.msg).toBe('Test message');
    expect(parsed.key).toBe('value');
    expect(parsed.timestamp).toBeDefined();
  });

  it('should include component name in output', () => {
    const logger = createLogger('http-server');
    (config as any).logLevel = 'info';

    logger.info('Request received');

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const output = consoleInfoSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed.component).toBe('http-server');
  });

  it('should respect log level - skip debug when level is info', () => {
    (config as any).logLevel = 'info';
    const logger = createLogger('test');

    logger.debug('Debug message');
    logger.info('Info message');

    expect(consoleDebugSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
  });

  it('should respect log level - allow debug when level is debug', () => {
    (config as any).logLevel = 'debug';
    const logger = createLogger('test');

    logger.debug('Debug message');
    logger.info('Info message');

    expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
  });

  it('should respect log level - only error when level is error', () => {
    (config as any).logLevel = 'error';
    const logger = createLogger('test');

    logger.error('Error message');
    logger.warn('Warn message');
    logger.info('Info message');
    logger.debug('Debug message');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleDebugSpy).not.toHaveBeenCalled();
  });

  it('should include metadata in output', () => {
    (config as any).logLevel = 'info';
    const logger = createLogger('database');

    logger.info('Query executed', {
      query: 'SELECT * FROM users',
      duration_ms: 45,
      rows: 100,
    });

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const output = consoleInfoSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed.query).toBe('SELECT * FROM users');
    expect(parsed.duration_ms).toBe(45);
    expect(parsed.rows).toBe(100);
  });

  it('should use correct console method for each level', () => {
    (config as any).logLevel = 'debug';

    log('error', 'test', 'Error message');
    log('warn', 'test', 'Warn message');
    log('info', 'test', 'Info message');
    log('debug', 'test', 'Debug message');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
  });

  it('should include timestamp in ISO format', () => {
    (config as any).logLevel = 'info';
    const logger = createLogger('test');

    logger.info('Test message');

    const output = consoleInfoSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should handle messages without metadata', () => {
    (config as any).logLevel = 'info';
    const logger = createLogger('test');

    logger.info('Simple message');

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const output = consoleInfoSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed.level).toBe('info');
    expect(parsed.component).toBe('test');
    expect(parsed.msg).toBe('Simple message');
    expect(parsed.timestamp).toBeDefined();
  });
});
