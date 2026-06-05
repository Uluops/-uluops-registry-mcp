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
  // ULUOPS_REGISTRY_URL is optional. When unset or empty, RegistryClient falls
  // back to @uluops/registry-sdk's DEFAULT_BASE_URL (prod by default,
  // localhost when NODE_ENV=development).
  const rawUrl = process.env['ULUOPS_REGISTRY_URL'];
  const apiUrl = rawUrl !== undefined && rawUrl !== '' ? rawUrl : undefined;
  const apiKey = process.env['ULUOPS_API_KEY'];
  const orgSlug = process.env['ULUOPS_ORG_SLUG'];

  return {
    api: {
      baseUrl: apiUrl,
      apiKey,
      orgSlug,
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
 * Hosts allowlisted for the registry URL by default. Anything else must
 * be explicitly opted into via ULUOPS_ALLOW_ANY_REGISTRY_HOST=1.
 * Loopback names (localhost, 127.x.x.x, ::1) are also accepted to support
 * local development against a self-hosted instance.
 *
 * Suffix check requires the leading dot — `endsWith('uluops.ai')` without
 * the dot would accept attacker-controlled `eviluluops.ai`. The exact-
 * match branch covers the bare apex.
 */
function isAllowedRegistryHost(hostname: string): boolean {
  if (hostname === 'localhost') return true;
  if (hostname === '127.0.0.1' || hostname.startsWith('127.')) return true;
  if (hostname === '::1' || hostname === '[::1]') return true;
  if (hostname === 'uluops.ai') return true;
  if (hostname.endsWith('.uluops.ai')) return true;
  return false;
}

/**
 * RFC-1918, IMDS, and link-local addresses that should never receive the
 * API key by accident. Even with ULUOPS_ALLOW_ANY_REGISTRY_HOST=1, these
 * hosts require an explicit ULUOPS_ALLOW_PRIVATE_REGISTRY=1 second escape
 * hatch — the typical AI-agent-driven misconfiguration we are defending
 * against would not set both env vars.
 */
function isPrivateOrMetadataHost(hostname: string): boolean {
  // AWS / GCP / Azure instance metadata service
  if (hostname === '169.254.169.254') return true;
  // RFC-1918 ranges (rough prefix match; sufficient for defense-in-depth)
  if (hostname.startsWith('10.')) return true;
  if (hostname.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  // Link-local
  if (hostname.startsWith('169.254.')) return true;
  return false;
}

/**
 * Validate that required configuration is present and well-formed.
 *
 * Returns a list of non-fatal warnings (e.g., custom registry URL accepted
 * via escape hatch) that the caller should log so the user sees what
 * happened during startup.
 */
export function validateConfig(config: RegistryMcpConfig): { warnings: string[] } {
  const warnings: string[] = [];

  // baseUrl is optional. When undefined, RegistryClient falls back to the
  // SDK's DEFAULT_BASE_URL — a trusted compile-time constant, so the SSRF
  // defense below only runs when the operator explicitly set a URL.
  if (config.api.baseUrl !== undefined) {
    let parsed: URL;
    try {
      parsed = new URL(config.api.baseUrl);
    } catch {
      throw new Error(`Invalid Registry API URL: ${config.api.baseUrl}`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Registry API URL must use http or https scheme, got: ${parsed.protocol}`);
    }

    // SSRF defense (CWE-918). The URL receives ULUOPS_API_KEY as a Bearer
    // header on every request. By default only *.uluops.ai (the canonical
    // host) and loopback (localhost dev) are allowed without opt-in.
    const allowAnyHost = process.env['ULUOPS_ALLOW_ANY_REGISTRY_HOST'] === '1';
    const allowPrivate = process.env['ULUOPS_ALLOW_PRIVATE_REGISTRY'] === '1';
    const hostname = parsed.hostname.toLowerCase();

    if (isPrivateOrMetadataHost(hostname) && !allowPrivate) {
      throw new Error(
        `Registry API URL host '${hostname}' is a private or instance-metadata address. ` +
        `If you really intend this, set ULUOPS_ALLOW_PRIVATE_REGISTRY=1 to acknowledge the risk.`,
      );
    }

    if (!isAllowedRegistryHost(hostname) && !allowAnyHost) {
      throw new Error(
        `Registry API URL host '${hostname}' is not on the default allowlist. ` +
        `By default only *.uluops.ai and loopback are accepted to prevent the ` +
        `API key from being forwarded to untrusted hosts. If you are pointing ` +
        `at a non-production endpoint, set ULUOPS_ALLOW_ANY_REGISTRY_HOST=1 to ` +
        `acknowledge the risk.`,
      );
    }

    if (allowAnyHost && !isAllowedRegistryHost(hostname)) {
      warnings.push(
        `Registry API URL host '${hostname}' accepted via ULUOPS_ALLOW_ANY_REGISTRY_HOST=1. ` +
        `Every API call will forward ULUOPS_API_KEY as a Bearer header to this host.`,
      );
    }

    if (parsed.username !== '' || parsed.password !== '') {
      throw new Error(
        'Registry API URL must not include userinfo (user:pass@). Set ULUOPS_API_KEY instead.',
      );
    }
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

  return { warnings };
}
