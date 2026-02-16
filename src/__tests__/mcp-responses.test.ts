import { describe, it, expect } from 'vitest';
import { createSuccessResponse, createErrorResponse } from '../types/mcp.js';

describe('createSuccessResponse', () => {
  it('wraps data in MCP text content', () => {
    const data = { name: 'test', version: '1.0.0' };
    const result = createSuccessResponse(data);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(data);
    expect(result.isError).toBeUndefined();
  });

  it('pretty-prints JSON with 2-space indent', () => {
    const data = { key: 'value' };
    const result = createSuccessResponse(data);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it('handles null by returning success: true', () => {
    const result = createSuccessResponse(null);
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
  });

  it('handles undefined by returning success: true', () => {
    const result = createSuccessResponse(undefined);
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
  });

  it('handles arrays', () => {
    const data = [1, 2, 3];
    const result = createSuccessResponse(data);
    expect(JSON.parse(result.content[0].text)).toEqual([1, 2, 3]);
  });

  it('handles strings', () => {
    const result = createSuccessResponse('hello');
    expect(JSON.parse(result.content[0].text)).toBe('hello');
  });
});

describe('createErrorResponse', () => {
  it('wraps error message in MCP error content', () => {
    const result = createErrorResponse('Something failed');

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual({ error: 'Something failed' });
    expect(result.isError).toBe(true);
  });
});
