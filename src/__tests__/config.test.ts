import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, validateConfig } from '../config/index.js';
import type { RegistryMcpConfig } from '../types/index.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads required config from environment', () => {
    process.env['ULUOPS_REGISTRY_URL'] = 'http://localhost:3001/api/v1';
    process.env['ULUOPS_API_KEY'] = 'test-key';

    const config = loadConfig();
    expect(config.api.baseUrl).toBe('http://localhost:3001/api/v1');
    expect(config.api.apiKey).toBe('test-key');
  });

  it('uses production default when ULUOPS_REGISTRY_URL is missing', () => {
    delete process.env['ULUOPS_REGISTRY_URL'];
    const config = loadConfig();
    expect(config.api.baseUrl).toBe('https://api.uluops.ai/api/v1/registry');
  });

  it('uses production default when ULUOPS_REGISTRY_URL is empty string', () => {
    process.env['ULUOPS_REGISTRY_URL'] = '';
    const config = loadConfig();
    expect(config.api.baseUrl).toBe('https://api.uluops.ai/api/v1/registry');
  });

  it('uses default timeout when not specified', () => {
    process.env['ULUOPS_REGISTRY_URL'] = 'http://localhost:3001';
    const config = loadConfig();
    expect(config.api.timeout).toBe(30000);
  });

  it('parses custom timeout', () => {
    process.env['ULUOPS_REGISTRY_URL'] = 'http://localhost:3001';
    process.env['ULUOPS_REGISTRY_TIMEOUT'] = '5000';
    const config = loadConfig();
    expect(config.api.timeout).toBe(5000);
  });

  it('falls back to default timeout for invalid value', () => {
    process.env['ULUOPS_REGISTRY_URL'] = 'http://localhost:3001';
    process.env['ULUOPS_REGISTRY_TIMEOUT'] = 'not-a-number';
    const config = loadConfig();
    expect(config.api.timeout).toBe(30000);
  });

  it('uses default retries when not specified', () => {
    process.env['ULUOPS_REGISTRY_URL'] = 'http://localhost:3001';
    const config = loadConfig();
    expect(config.api.retries).toBe(3);
  });

  it('parses custom retries', () => {
    process.env['ULUOPS_REGISTRY_URL'] = 'http://localhost:3001';
    process.env['ULUOPS_REGISTRY_RETRIES'] = '5';
    const config = loadConfig();
    expect(config.api.retries).toBe(5);
  });

  it('parses valid log levels', () => {
    process.env['ULUOPS_REGISTRY_URL'] = 'http://localhost:3001';
    process.env['LOG_LEVEL'] = 'debug';
    const config = loadConfig();
    expect(config.security.logLevel).toBe('debug');
  });

  it('defaults to info for invalid log level', () => {
    process.env['ULUOPS_REGISTRY_URL'] = 'http://localhost:3001';
    process.env['LOG_LEVEL'] = 'invalid';
    const config = loadConfig();
    expect(config.security.logLevel).toBe('info');
  });

  it('parses boolean env vars', () => {
    process.env['ULUOPS_REGISTRY_URL'] = 'http://localhost:3001';
    process.env['ENABLE_FILE_LOGGING'] = 'true';
    process.env['VERBOSE_LOGGING'] = '1';
    const config = loadConfig();
    expect(config.security.enableLogging).toBe(true);
    expect(config.security.verboseLogging).toBe(true);
  });

  it('defaults booleans to false', () => {
    process.env['ULUOPS_REGISTRY_URL'] = 'http://localhost:3001';
    const config = loadConfig();
    expect(config.security.enableLogging).toBe(false);
    expect(config.security.verboseLogging).toBe(false);
    expect(config.security.logPerformanceMetrics).toBe(false);
  });
});

describe('validateConfig', () => {
  function makeConfig(overrides?: Partial<RegistryMcpConfig>): RegistryMcpConfig {
    return {
      api: {
        baseUrl: 'http://localhost:3001/api/v1',
        apiKey: 'test-key',
        timeout: 30000,
        retries: 3,
        ...overrides?.api,
      },
      server: {
        name: 'test-server',
        version: '1.0.0',
        ...overrides?.server,
      },
      security: {
        logLevel: 'info',
        enableLogging: false,
        verboseLogging: false,
        logPerformanceMetrics: false,
        ...overrides?.security,
      },
    };
  }

  it('passes with valid config', () => {
    expect(() => validateConfig(makeConfig())).not.toThrow();
  });

  it('throws when baseUrl is empty', () => {
    expect(() =>
      validateConfig(
        makeConfig({ api: { baseUrl: '', apiKey: 'key', timeout: 30000, retries: 3 } })
      )
    ).toThrow('Registry API base URL is required');
  });

  it('throws when baseUrl is invalid URL', () => {
    expect(() =>
      validateConfig(
        makeConfig({ api: { baseUrl: 'not-a-url', apiKey: 'key', timeout: 30000, retries: 3 } })
      )
    ).toThrow('Invalid Registry API URL');
  });

  it('throws when baseUrl uses non-http scheme', () => {
    expect(() =>
      validateConfig(
        makeConfig({
          api: { baseUrl: 'file:///etc/passwd', apiKey: 'key', timeout: 30000, retries: 3 },
        })
      )
    ).toThrow('must use http or https scheme');
  });

  it('accepts https URLs', () => {
    expect(() =>
      validateConfig(
        makeConfig({
          api: { baseUrl: 'https://api.example.com', apiKey: 'key', timeout: 30000, retries: 3 },
        })
      )
    ).not.toThrow();
  });

  it('throws when apiKey is missing', () => {
    expect(() =>
      validateConfig(
        makeConfig({
          api: { baseUrl: 'http://localhost:3001', apiKey: undefined, timeout: 30000, retries: 3 },
        })
      )
    ).toThrow('API key is required');
  });

  it('throws when apiKey is empty string', () => {
    expect(() =>
      validateConfig(
        makeConfig({
          api: { baseUrl: 'http://localhost:3001', apiKey: '', timeout: 30000, retries: 3 },
        })
      )
    ).toThrow('API key is required');
  });

  it('throws when timeout is zero', () => {
    expect(() =>
      validateConfig(
        makeConfig({
          api: { baseUrl: 'http://localhost:3001', apiKey: 'key', timeout: 0, retries: 3 },
        })
      )
    ).toThrow('Timeout must be a positive number');
  });

  it('throws when timeout is negative', () => {
    expect(() =>
      validateConfig(
        makeConfig({
          api: { baseUrl: 'http://localhost:3001', apiKey: 'key', timeout: -1, retries: 3 },
        })
      )
    ).toThrow('Timeout must be a positive number');
  });

  it('throws when retries is negative', () => {
    expect(() =>
      validateConfig(
        makeConfig({
          api: { baseUrl: 'http://localhost:3001', apiKey: 'key', timeout: 30000, retries: -1 },
        })
      )
    ).toThrow('Retries must be a non-negative number');
  });

  it('allows zero retries', () => {
    expect(() =>
      validateConfig(
        makeConfig({
          api: { baseUrl: 'http://localhost:3001', apiKey: 'key', timeout: 30000, retries: 0 },
        })
      )
    ).not.toThrow();
  });
});
