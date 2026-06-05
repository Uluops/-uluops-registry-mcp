/**
 * Structured logger with optional file output
 *
 * Logs to stderr (for MCP compatibility) and optionally to files.
 */

import { appendFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
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

/**
 * Validate that a log directory path is safe to write to.
 * Rejects paths containing traversal sequences or pointing outside the working tree.
 * Dereferences symlinks before the containment check (CWE-59) so a symlink
 * named e.g. './logs' pointing to /etc cannot escape the cwd/tmp constraint.
 */
function validateLogDir(logDir: string): string {
  const resolved = resolve(logDir);
  // Reject path traversal patterns
  if (logDir.includes('..')) {
    throw new Error(`LOG_DIR must not contain path traversal sequences: ${logDir}`);
  }

  // If the path already exists, dereference symlinks before the containment
  // check (CWE-59). If it doesn't exist yet, mkdir below will create a real
  // directory and the literal resolved path is the right comparison.
  let real = resolved;
  try {
    real = realpathSync(resolved);
  } catch {
    // Path doesn't exist; ensureLogDir() will create a regular directory.
  }

  // Dereference the comparison anchors too — on macOS /tmp is a symlink to
  // /private/tmp, so a realpathSync'd `real` of /tmp/foo becomes
  // /private/tmp/foo and would otherwise fail a literal startsWith('/tmp/')
  // check.
  const cwd = safeRealpath(process.cwd());
  const tmpPrefixes = ['/tmp/', safeRealpath('/tmp') + '/'];

  // Absolute paths must be under cwd or a well-known logs location
  if (isAbsolute(logDir) && !real.startsWith(cwd) && !tmpPrefixes.some((p) => real.startsWith(p))) {
    throw new Error(
      `LOG_DIR absolute path must be under the working directory or /tmp/: ${logDir}`
    );
  }
  return resolved;
}

function safeRealpath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
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
  const rawLogDir = logDir ?? join(process.cwd(), 'logs');
  const resolvedLogDir = enableFileLogging ? validateLogDir(rawLogDir) : rawLogDir;

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
      } catch (fileError: unknown) {
        if (!fileLoggingFailed) {
          fileLoggingFailed = true;
          const detail = fileError instanceof Error ? fileError.message : String(fileError);
          console.error(
            formatLogEntry('warn', `File logging failed: ${detail}. Further file log errors suppressed`)
          );
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
