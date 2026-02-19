import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { createLogger } from '../utils/logger.js';

describe('createLogger', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('creates logger from string config', () => {
    const logger = createLogger('info');
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
  });

  it('creates logger from object config', () => {
    const logger = createLogger({ level: 'debug' });
    expect(logger).toHaveProperty('debug');
  });

  it('logs at info level and above when level is info', () => {
    const logger = createLogger('info');

    logger.debug('debug msg');
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    logger.info('info msg');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    logger.warn('warn msg');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

    logger.error('error msg');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
  });

  it('logs all levels when level is debug', () => {
    const logger = createLogger('debug');

    logger.debug('msg');
    logger.info('msg');
    logger.warn('msg');
    logger.error('msg');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(4);
  });

  it('only logs errors when level is error', () => {
    const logger = createLogger('error');

    logger.debug('msg');
    logger.info('msg');
    logger.warn('msg');
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    logger.error('msg');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('outputs structured JSON to stderr', () => {
    const logger = createLogger('info');
    logger.info('test message', { key: 'value' });

    const output = consoleErrorSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed.level).toBe('INFO');
    expect(parsed.message).toBe('test message');
    expect(parsed.context).toEqual({ key: 'value' });
  });

  it('omits context when empty', () => {
    const logger = createLogger('info');
    logger.info('no context');

    const output = consoleErrorSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed).not.toHaveProperty('context');
  });

  it('omits context when object is empty', () => {
    const logger = createLogger('info');
    logger.info('empty context', {});

    const output = consoleErrorSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed).not.toHaveProperty('context');
  });

  it('rejects LOG_DIR with path traversal sequences', () => {
    expect(() =>
      createLogger({ level: 'info', enableFileLogging: true, logDir: '../../../etc' })
    ).toThrow('LOG_DIR must not contain path traversal sequences');
  });

  it('rejects absolute LOG_DIR outside working directory', () => {
    expect(() =>
      createLogger({ level: 'info', enableFileLogging: true, logDir: '/etc/passwd' })
    ).toThrow('LOG_DIR absolute path must be under the working directory or /tmp/');
  });

  it('accepts LOG_DIR under /tmp/', () => {
    const logger = createLogger({
      level: 'info',
      enableFileLogging: true,
      logDir: '/tmp/test-logs',
    });
    expect(logger).toHaveProperty('info');
  });

  it('writes log entries to file when file logging is enabled', () => {
    const logDir = '/tmp/registry-mcp-test-logs';

    // Clean up from any prior run
    if (existsSync(logDir)) {
      rmSync(logDir, { recursive: true });
    }
    mkdirSync(logDir, { recursive: true });

    const logger = createLogger({
      level: 'info',
      enableFileLogging: true,
      logDir,
    });

    logger.info('file logging test');

    const files = readdirSync(logDir).filter((f) => f.endsWith('.log'));
    expect(files.length).toBeGreaterThan(0);

    const content = readFileSync(`${logDir}/${files[0] ?? ''}`, 'utf-8');
    expect(content).toContain('file logging test');

    // Clean up
    rmSync(logDir, { recursive: true });
  });
});
