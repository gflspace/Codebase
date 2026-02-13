import { describe, it, expect, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  metricsMiddleware,
  recordDbQuery,
  recordEventProcessed,
  getMetricsText,
  resetMetrics,
} from '../../src/api/middleware/metrics';

describe('Metrics Middleware', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should increment request counter', async () => {
    const req = { method: 'GET', path: '/api/users' } as Request;
    const res = {
      statusCode: 200,
      on: (event: string, handler: () => void) => {
        if (event === 'finish') {
          setTimeout(handler, 0);
        }
      },
    } as unknown as Response;
    const next = (() => {}) as NextFunction;

    metricsMiddleware(req, res, next);

    // Wait for async finish event
    await new Promise((resolve) => setTimeout(resolve, 10));

    const metricsText = getMetricsText();
    expect(metricsText).toContain('http_requests_total{method="GET",path="/api/users",status="200"} 1');
  });

  it('should record request duration', async () => {
    const req = { method: 'POST', path: '/api/events' } as Request;
    const res = {
      statusCode: 202,
      on: (event: string, handler: () => void) => {
        if (event === 'finish') {
          setTimeout(handler, 5); // Simulate 5ms delay
        }
      },
    } as unknown as Response;
    const next = (() => {}) as NextFunction;

    metricsMiddleware(req, res, next);

    // Wait for async finish event
    await new Promise((resolve) => setTimeout(resolve, 20));

    const metricsText = getMetricsText();
    expect(metricsText).toContain('http_request_duration_ms{method="POST",path="/api/events",quantile="0.5"}');
  });

  it('should normalize UUIDs in paths', async () => {
    const req = { method: 'GET', path: '/api/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890' } as Request;
    const res = {
      statusCode: 200,
      on: (event: string, handler: () => void) => {
        if (event === 'finish') {
          setTimeout(handler, 0);
        }
      },
    } as unknown as Response;
    const next = (() => {}) as NextFunction;

    metricsMiddleware(req, res, next);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const metricsText = getMetricsText();
    expect(metricsText).toContain('path="/api/users/:id"');
    expect(metricsText).not.toContain('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('should increment database query counter', () => {
    recordDbQuery(10);
    recordDbQuery(20);
    recordDbQuery(30);

    const metricsText = getMetricsText();
    expect(metricsText).toContain('db_queries_total 3');
  });

  it('should track database query duration quantiles', () => {
    recordDbQuery(5);
    recordDbQuery(10);
    recordDbQuery(15);
    recordDbQuery(100);

    const metricsText = getMetricsText();
    expect(metricsText).toContain('db_query_duration_ms{quantile="0.5"}');
    expect(metricsText).toContain('db_query_duration_ms{quantile="0.95"}');
    expect(metricsText).toContain('db_query_duration_ms{quantile="0.99"}');
  });

  it('should track events processed by type', () => {
    recordEventProcessed('message.created');
    recordEventProcessed('message.created');
    recordEventProcessed('transaction.completed');

    const metricsText = getMetricsText();
    expect(metricsText).toContain('events_processed_total{event_type="message.created"} 2');
    expect(metricsText).toContain('events_processed_total{event_type="transaction.completed"} 1');
  });

  it('should return valid Prometheus text format', () => {
    recordDbQuery(10);
    recordEventProcessed('test.event');

    const metricsText = getMetricsText();

    // Should have HELP and TYPE lines
    expect(metricsText).toContain('# HELP db_queries_total');
    expect(metricsText).toContain('# TYPE db_queries_total counter');
    expect(metricsText).toContain('# HELP events_processed_total');
    expect(metricsText).toContain('# TYPE events_processed_total counter');

    // Should have process uptime
    expect(metricsText).toContain('process_uptime_seconds');
  });

  it('should reset all metrics', async () => {
    // Add some metrics
    const req = { method: 'GET', path: '/api/health' } as Request;
    const res = {
      statusCode: 200,
      on: (event: string, handler: () => void) => {
        if (event === 'finish') {
          setTimeout(handler, 0);
        }
      },
    } as unknown as Response;
    const next = (() => {}) as NextFunction;

    metricsMiddleware(req, res, next);
    recordDbQuery(10);
    recordEventProcessed('test.event');

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify metrics exist
    let metricsText = getMetricsText();
    expect(metricsText).toContain('db_queries_total 1');

    // Reset
    resetMetrics();

    // Verify metrics cleared
    metricsText = getMetricsText();
    expect(metricsText).toContain('db_queries_total 0');
  });

  it('should track active connections', async () => {
    const req = { method: 'GET', path: '/api/test' } as Request;
    let finishHandler: (() => void) | null = null;

    const res = {
      statusCode: 200,
      on: (event: string, handler: () => void) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      },
    } as unknown as Response;
    const next = (() => {}) as NextFunction;

    metricsMiddleware(req, res, next);

    // Before finish, should have active connection
    let metricsText = getMetricsText();
    expect(metricsText).toContain('active_connections 1');

    // After finish
    if (finishHandler) finishHandler();
    await new Promise((resolve) => setTimeout(resolve, 10));

    metricsText = getMetricsText();
    expect(metricsText).toContain('active_connections 0');
  });

  it('should handle multiple concurrent requests', async () => {
    const requests = [
      { method: 'GET', path: '/api/users', status: 200 },
      { method: 'POST', path: '/api/events', status: 202 },
      { method: 'GET', path: '/api/users/123e4567-e89b-12d3-a456-426614174000', status: 200 },
    ];

    for (const reqData of requests) {
      const req = { method: reqData.method, path: reqData.path } as Request;
      const res = {
        statusCode: reqData.status,
        on: (event: string, handler: () => void) => {
          if (event === 'finish') {
            setTimeout(handler, 0);
          }
        },
      } as unknown as Response;
      const next = (() => {}) as NextFunction;

      metricsMiddleware(req, res, next);
    }

    await new Promise((resolve) => setTimeout(resolve, 20));

    const metricsText = getMetricsText();
    expect(metricsText).toContain('http_requests_total{method="GET",path="/api/users",status="200"} 1');
    expect(metricsText).toContain('http_requests_total{method="POST",path="/api/events",status="202"} 1');
    expect(metricsText).toContain('http_requests_total{method="GET",path="/api/users/:id",status="200"} 1');
  });
});
