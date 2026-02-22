import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createResourceResponse,
  createErrorResourceResponse,
  fetchResourceWithTimeout,
} from '../resources/response-helpers.js';

describe('createResourceResponse', () => {
  it('wraps data in resource content with correct URI', () => {
    const data = { items: [{ name: 'test' }] };
    const result = createResourceResponse('registry://definitions', data);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe('registry://definitions');
    expect(result.contents[0].mimeType).toBe('application/json');
    expect(JSON.parse(result.contents[0].text ?? '')).toEqual(data);
  });

  it('pretty-prints JSON with 2-space indent', () => {
    const data = { key: 'value' };
    const result = createResourceResponse('registry://test', data);
    expect(result.contents[0].text).toBe(JSON.stringify(data, null, 2));
  });
});

describe('createErrorResourceResponse', () => {
  it('wraps error message in resource content', () => {
    const result = createErrorResourceResponse('registry://definitions', 'Not found');

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe('registry://definitions');
    expect(result.contents[0].mimeType).toBe('application/json');
    expect(JSON.parse(result.contents[0].text ?? '')).toEqual({ error: 'Not found' });
  });
});

describe('fetchResourceWithTimeout', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    consoleSpy.mockClear();
  });
  it('returns resource response on successful fetch', async () => {
    const data = { items: ['a'] };
    const result = await fetchResourceWithTimeout('registry://test', () =>
      Promise.resolve(data)
    );
    expect(result.contents[0].uri).toBe('registry://test');
    expect(JSON.parse(result.contents[0].text ?? '')).toEqual(data);
  });

  it('returns error response when fetcher rejects', async () => {
    const result = await fetchResourceWithTimeout('registry://test', () =>
      Promise.reject(new Error('Connection refused'))
    );
    const parsed = JSON.parse(result.contents[0].text ?? '');
    expect(parsed.error).toBe('Connection refused');
  });

  it('returns error response on timeout', async () => {
    vi.useFakeTimers();
    const neverResolves = new Promise<never>(() => {});
    const resultPromise = fetchResourceWithTimeout('registry://test', () => neverResolves);

    // Advance past the 15s timeout
    await vi.advanceTimersByTimeAsync(16_000);

    const result = await resultPromise;
    const parsed = JSON.parse(result.contents[0].text ?? '');
    expect(parsed.error).toBe('Resource request timed out');

    vi.useRealTimers();
  });

  it('handles non-Error throws gracefully', async () => {
    const result = await fetchResourceWithTimeout('registry://test', () =>
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- intentionally testing non-Error rejection
      Promise.reject('string error')
    );
    const parsed = JSON.parse(result.contents[0].text ?? '');
    expect(parsed.error).toBe('Unknown error');
  });
});
