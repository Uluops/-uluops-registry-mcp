import { describe, it, expect } from 'vitest';
import {
  createResourceResponse,
  createErrorResourceResponse,
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
