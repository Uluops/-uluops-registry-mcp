/**
 * Structured logger with optional file output
 *
 * Logs to stderr (for MCP compatibility) and optionally to files.
 */

import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { LogLevel } from '../types/index.js';

export interface LoggerConfig {
  level: LogLevel;
  enableFileLogging?: boolean;
  logDir?: string;
}

export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  };
  return JSON.stringify(entry);
}

function getLogFilePath(logDir: string): string {
  const date = new Date().toISOString().split('T')[0] ?? 'unknown';
  return join(logDir, `registry-mcp-${date}.log`);
}

function ensureLogDir(logDir: string): void {
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
}

export function createLogger(config: LoggerConfig | LogLevel): Logger {
  const resolvedConfig: LoggerConfig = typeof config === 'string' ? { level: config } : config;
  const { level, enableFileLogging = false, logDir } = resolvedConfig;
  const minLevel = LOG_LEVELS[level];
  const resolvedLogDir = logDir ?? join(process.cwd(), 'logs');

  if (enableFileLogging) {
    ensureLogDir(resolvedLogDir);
  }

  let fileLoggingFailed = false;

  const log = (logLevel: LogLevel, message: string, context?: Record<string, unknown>): void => {
    if (LOG_LEVELS[logLevel] < minLevel) {
      return;
    }

    const formatted = formatLogEntry(logLevel, message, context);
    console.error(formatted);

    if (enableFileLogging) {
      try {
        const filePath = getLogFilePath(resolvedLogDir);
        appendFileSync(filePath, formatted + '\n', 'utf-8');
      } catch {
        if (!fileLoggingFailed) {
          fileLoggingFailed = true;
          console.error(formatLogEntry('warn', 'File logging failed, further file log errors suppressed'));
        }
      }
    }
  };

  return {
    debug: (message: string, context?: Record<string, unknown>): void => {
      log('debug', message, context);
    },
    info: (message: string, context?: Record<string, unknown>): void => {
      log('info', message, context);
    },
    warn: (message: string, context?: Record<string, unknown>): void => {
      log('warn', message, context);
    },
    error: (message: string, context?: Record<string, unknown>): void => {
      log('error', message, context);
    },
  };
}
