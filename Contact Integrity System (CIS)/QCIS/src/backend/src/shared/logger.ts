import { config } from '../config';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// ─── Log Level Priority ───────────────────────────────────────────

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// ─── Core Logging Function ────────────────────────────────────────

export function log(
  level: LogLevel,
  component: string,
  msg: string,
  meta?: Record<string, unknown>
): void {
  // Get configured log level (with fallback)
  const configuredLevel = (config.logLevel || 'info') as LogLevel;
  const configuredPriority = LOG_LEVEL_PRIORITY[configuredLevel] ?? LOG_LEVEL_PRIORITY.info;
  const messagePriority = LOG_LEVEL_PRIORITY[level];

  // Skip messages below configured level
  if (messagePriority > configuredPriority) {
    return;
  }

  // Build structured log object
  const logEntry: Record<string, unknown> = {
    level,
    component,
    msg,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  // Output as single-line JSON
  const output = JSON.stringify(logEntry);

  // Route to appropriate console method
  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'info':
      console.info(output);
      break;
    case 'debug':
      console.debug(output);
      break;
  }
}

// ─── Logger Factory ───────────────────────────────────────────────

export interface Logger {
  error(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
}

export function createLogger(component: string): Logger {
  return {
    error(msg: string, meta?: Record<string, unknown>): void {
      log('error', component, msg, meta);
    },
    warn(msg: string, meta?: Record<string, unknown>): void {
      log('warn', component, msg, meta);
    },
    info(msg: string, meta?: Record<string, unknown>): void {
      log('info', component, msg, meta);
    },
    debug(msg: string, meta?: Record<string, unknown>): void {
      log('debug', component, msg, meta);
    },
  };
}
