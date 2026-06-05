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

  it('leaves baseUrl undefined when ULUOPS_REGISTRY_URL is missing (SDK resolves default)', () => {
    delete process.env['ULUOPS_REGISTRY_URL'];
    const config = loadConfig();
    expect(config.api.baseUrl).toBeUndefined();
  });

  it('leaves baseUrl undefined when ULUOPS_REGISTRY_URL is empty string', () => {
    process.env['ULUOPS_REGISTRY_URL'] = '';
    const config = loadConfig();
    expect(config.api.baseUrl).toBeUndefined();
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

  it('skips URL validation entirely when baseUrl is undefined (SDK default)', () => {
    expect(() =>
      validateConfig(
        makeConfig({ api: { baseUrl: undefined, apiKey: 'key', timeout: 30000, retries: 3 } })
      )
    ).not.toThrow();
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

  it('accepts https URLs on the default allowlist (*.uluops.ai)', () => {
    expect(() =>
      validateConfig(
        makeConfig({
          api: { baseUrl: 'https://api.uluops.ai/api/v1/registry', apiKey: 'key', timeout: 30000, retries: 3 },
        })
      )
    ).not.toThrow();
  });

  it('returns a warnings array (empty for default-allowed hosts)', () => {
    const result = validateConfig(makeConfig());
    expect(result).toEqual({ warnings: [] });
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

describe('validateConfig — SSRF defense', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['ULUOPS_ALLOW_ANY_REGISTRY_HOST'];
    delete process.env['ULUOPS_ALLOW_PRIVATE_REGISTRY'];
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  function ssrfConfig(baseUrl: string): RegistryMcpConfig {
    return {
      api: { baseUrl, apiKey: 'key', timeout: 30000, retries: 3 },
      server: { name: 't', version: '0' },
      security: { logLevel: 'info', enableLogging: false, verboseLogging: false, logPerformanceMetrics: false },
    };
  }

  it('rejects AWS IMDS (169.254.169.254) by default', () => {
    expect(() =>
      validateConfig(ssrfConfig('http://169.254.169.254/latest/meta-data/'))
    ).toThrow(/private or instance-metadata/);
  });

  it('rejects RFC-1918 10.x.x.x by default', () => {
    expect(() =>
      validateConfig(ssrfConfig('http://10.0.0.1/registry'))
    ).toThrow(/private or instance-metadata/);
  });

  it('rejects RFC-1918 192.168.x.x by default', () => {
    expect(() =>
      validateConfig(ssrfConfig('http://192.168.1.50/registry'))
    ).toThrow(/private or instance-metadata/);
  });

  it('rejects RFC-1918 172.16-31.x.x by default', () => {
    expect(() =>
      validateConfig(ssrfConfig('http://172.16.0.5/registry'))
    ).toThrow(/private or instance-metadata/);
    expect(() =>
      validateConfig(ssrfConfig('http://172.31.255.255/registry'))
    ).toThrow(/private or instance-metadata/);
    // 172.15 and 172.32 are NOT RFC-1918 — should be allowed via any-host escape only
    expect(() =>
      validateConfig(ssrfConfig('http://172.15.0.1/registry'))
    ).toThrow(/not on the default allowlist/);
  });

  it('rejects link-local 169.254.x.x by default', () => {
    expect(() =>
      validateConfig(ssrfConfig('http://169.254.0.1/registry'))
    ).toThrow(/private or instance-metadata/);
  });

  it('rejects unrecognized public hosts by default', () => {
    expect(() =>
      validateConfig(ssrfConfig('https://attacker.example.com/exfil'))
    ).toThrow(/not on the default allowlist/);
  });

  it('accepts *.uluops.ai by default', () => {
    expect(() =>
      validateConfig(ssrfConfig('https://api.uluops.ai/api/v1/registry'))
    ).not.toThrow();
    expect(() =>
      validateConfig(ssrfConfig('https://staging.uluops.ai/api/v1/registry'))
    ).not.toThrow();
  });

  it('accepts the bare apex uluops.ai', () => {
    expect(() =>
      validateConfig(ssrfConfig('https://uluops.ai/api/v1/registry'))
    ).not.toThrow();
  });

  it('rejects domains that end in "uluops.ai" without a leading dot (suffix bypass)', () => {
    // Regression for NEW-H-001 — endsWith('uluops.ai') without the leading
    // dot would match attacker-controlled `eviluluops.ai` and `notuluops.ai`.
    expect(() =>
      validateConfig(ssrfConfig('https://eviluluops.ai/exfil'))
    ).toThrow(/not on the default allowlist/);
    expect(() =>
      validateConfig(ssrfConfig('https://notuluops.ai/exfil'))
    ).toThrow(/not on the default allowlist/);
    expect(() =>
      validateConfig(ssrfConfig('https://1uluops.ai/exfil'))
    ).toThrow(/not on the default allowlist/);
  });

  it('accepts loopback (localhost, 127.x, ::1) by default', () => {
    expect(() => validateConfig(ssrfConfig('http://localhost:3001/'))).not.toThrow();
    expect(() => validateConfig(ssrfConfig('http://127.0.0.1:3001/'))).not.toThrow();
    expect(() => validateConfig(ssrfConfig('http://[::1]:3001/'))).not.toThrow();
  });

  it('accepts non-allowlisted host with ULUOPS_ALLOW_ANY_REGISTRY_HOST=1 and warns', () => {
    process.env['ULUOPS_ALLOW_ANY_REGISTRY_HOST'] = '1';
    const result = validateConfig(ssrfConfig('https://internal-mirror.corp.example/registry'));
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain('internal-mirror.corp.example');
    expect(result.warnings[0]).toContain('ULUOPS_ALLOW_ANY_REGISTRY_HOST');
  });

  it('still rejects private IPs even with ULUOPS_ALLOW_ANY_REGISTRY_HOST=1', () => {
    process.env['ULUOPS_ALLOW_ANY_REGISTRY_HOST'] = '1';
    expect(() =>
      validateConfig(ssrfConfig('http://10.0.0.1/registry'))
    ).toThrow(/private or instance-metadata/);
  });

  it('accepts private IPs with both escape hatches set', () => {
    process.env['ULUOPS_ALLOW_PRIVATE_REGISTRY'] = '1';
    process.env['ULUOPS_ALLOW_ANY_REGISTRY_HOST'] = '1';
    expect(() =>
      validateConfig(ssrfConfig('http://10.0.0.1/registry'))
    ).not.toThrow();
  });

  it('rejects URLs containing userinfo (user:pass@host)', () => {
    expect(() =>
      validateConfig(ssrfConfig('https://admin:secret@api.uluops.ai/api/v1/registry'))
    ).toThrow(/must not include userinfo/);
  });
});
