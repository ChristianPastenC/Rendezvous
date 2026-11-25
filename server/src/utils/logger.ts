import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

const formatLog = (level: LogLevel, message: string, meta?: Record<string, unknown>): string => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  return JSON.stringify(entry);
};

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(formatLog('info', message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(formatLog('warn', message, meta));
  },
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(formatLog('error', message, meta));
  },
};

/**
 * Attaches a unique X-Request-Id header to each HTTP request and logs structured
 * completion metrics on response finish.
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incomingId = req.headers['x-request-id'];
  const requestId =
    typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId.trim()
      : randomUUID();

  res.setHeader('X-Request-Id', requestId);
  (req as Request & { requestId?: string }).requestId = requestId;

  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP request completed', {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
};
