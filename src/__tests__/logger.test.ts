import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
});
