/**
 * Configuration loader for registry MCP client
 *
 * Loads configuration from environment variables with sensible defaults.
 */

import { createRequire } from 'module';
import type { RegistryMcpConfig, LogLevel } from '../types/index.js';

const require = createRequire(import.meta.url);
const { version: pkgVersion } = require('../../package.json') as { version: string };

/** Package version read from package.json at module load time. */
export const VERSION = pkgVersion;

const DEFAULT_BASE_URL = 'https://api.uluops.ai/api/v1/registry';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const DEFAULT_LOG_LEVEL: LogLevel = 'info';

function parseLogLevel(value: string | undefined): LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  if (value !== undefined && value !== '' && validLevels.includes(value as LogLevel)) {
    return value as LogLevel;
  }
  return DEFAULT_LOG_LEVEL;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function parseInteger(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Load configuration from environment variables.
 */
export function loadConfig(): RegistryMcpConfig {
  const apiUrl = process.env['ULUOPS_REGISTRY_URL'] || DEFAULT_BASE_URL;
  const apiKey = process.env['ULUOPS_API_KEY'];

  return {
    api: {
      baseUrl: apiUrl,
      apiKey,
      timeout: parseInteger(process.env['ULUOPS_REGISTRY_TIMEOUT'], DEFAULT_TIMEOUT),
      retries: parseInteger(process.env['ULUOPS_REGISTRY_RETRIES'], DEFAULT_RETRIES),
    },
    server: {
      name: 'uluops-registry-client',
      version: pkgVersion,
    },
    security: {
      logLevel: parseLogLevel(process.env['LOG_LEVEL']),
      enableLogging: parseBoolean(process.env['ENABLE_FILE_LOGGING'], false),
      logDir: process.env['LOG_DIR'],
      verboseLogging: parseBoolean(process.env['VERBOSE_LOGGING'], false),
      logPerformanceMetrics: parseBoolean(process.env['LOG_PERFORMANCE_METRICS'], false),
    },
  };
}

/**
 * Validate that required configuration is present and well-formed.
 */
export function validateConfig(config: RegistryMcpConfig): void {
  if (!config.api.baseUrl) {
    throw new Error('Registry API base URL is required');
  }

  try {
    const parsed = new URL(config.api.baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Registry API URL must use http or https scheme, got: ${parsed.protocol}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('scheme')) {
      throw error;
    }
    throw new Error(`Invalid Registry API URL: ${config.api.baseUrl}`);
  }

  if (config.api.apiKey === undefined || config.api.apiKey === '') {
    throw new Error('API key is required. Set ULUOPS_API_KEY');
  }

  if (config.api.timeout <= 0) {
    throw new Error('Timeout must be a positive number');
  }

  if (config.api.retries < 0) {
    throw new Error('Retries must be a non-negative number');
  }
}
