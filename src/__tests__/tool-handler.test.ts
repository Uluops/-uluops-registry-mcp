import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { createToolHandler, extractFieldsParam, filterResponseFields } from '../utils/tool-handler.js';
import { setDefaultType } from '../utils/session-state.js';

describe('createToolHandler', () => {
  beforeEach(() => {
    setDefaultType(undefined);
  });

  const testSchema = z.object({
    definition_type: z.string(),
    include_yaml: z.boolean().optional(),
  });

  it('validates input with Zod schema', async () => {
    const sdkCall = vi.fn().mockResolvedValue({ id: '123' });
    const handler = createToolHandler(testSchema, sdkCall);

    const result = await handler({ definition_type: 'agent' });
    expect(result.isError).toBeUndefined();
    expect(sdkCall).toHaveBeenCalled();
  });

  it('normalizes snake_case keys to camelCase before SDK call', async () => {
    const sdkCall = vi.fn().mockResolvedValue({});
    const handler = createToolHandler(testSchema, sdkCall);

    await handler({ definition_type: 'agent', include_yaml: true });
    expect(sdkCall).toHaveBeenCalledWith({
      definitionType: 'agent',
      includeYaml: true,
    });
  });

  it('returns success response with data', async () => {
    const data = { name: 'test', version: '1.0.0' };
    const sdkCall = vi.fn().mockResolvedValue(data);
    const handler = createToolHandler(testSchema, sdkCall);

    const result = await handler({ definition_type: 'agent' });
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(data);
  });

  it('returns success response for void SDK results', async () => {
    const sdkCall = vi.fn().mockResolvedValue(undefined);
    const handler = createToolHandler(testSchema, sdkCall);

    const result = await handler({ definition_type: 'agent' });
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
  });

  it('returns Zod error for invalid input', async () => {
    const sdkCall = vi.fn();
    const handler = createToolHandler(testSchema, sdkCall);

    const result = await handler({ not_a_field: 'bad' });
    expect(result.isError).toBe(true);
    expect(sdkCall).not.toHaveBeenCalled();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('Validation failed');
  });

  it('returns mapped SDK error on SDK call failure', async () => {
    const sdkCall = vi.fn().mockRejectedValue(new Error('Network timeout'));
    const handler = createToolHandler(testSchema, sdkCall);

    const result = await handler({ definition_type: 'agent' });
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Network timeout');
  });

  it('supports preProcess to transform input', async () => {
    const sdkCall = vi.fn().mockResolvedValue({});
    const handler = createToolHandler(testSchema, sdkCall, {
      preProcess: (input) => ({ ...input, definition_type: input.definition_type.toUpperCase() }),
    });

    await handler({ definition_type: 'agent' });
    expect(sdkCall).toHaveBeenCalledWith(expect.objectContaining({ definitionType: 'AGENT' }));
  });

  it('supports preProcess short-circuit with McpToolResponse', async () => {
    const sdkCall = vi.fn();
    const handler = createToolHandler(testSchema, sdkCall, {
      preProcess: () => ({
        content: [{ type: 'text' as const, text: '{"cached": true}' }],
      }),
    });

    const result = await handler({ definition_type: 'agent' });
    expect(sdkCall).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text)).toEqual({ cached: true });
  });

  it('does not treat objects with non-array content as McpToolResponse', async () => {
    const sdkCall = vi.fn().mockResolvedValue({});
    const handler = createToolHandler(testSchema, sdkCall, {
      // preProcess returns a TInput-shaped object that has a "content" property (string, not array)
      preProcess: (input) => ({ ...input, definition_type: 'modified' }),
    });

    await handler({ definition_type: 'agent' });
    // sdkCall should be called because preProcess returned TInput, not McpToolResponse
    expect(sdkCall).toHaveBeenCalledWith(expect.objectContaining({ definitionType: 'modified' }));
  });

  describe('session type injection', () => {
    const typeSchema = z.object({
      type: z.string().optional(),
      name: z.string(),
    });

    it('injects session type when args.type is undefined', async () => {
      setDefaultType('agent');
      const sdkCall = vi.fn().mockResolvedValue({});
      const handler = createToolHandler(typeSchema, sdkCall);

      await handler({ name: 'test' });
      expect(sdkCall).toHaveBeenCalledWith(expect.objectContaining({ type: 'agent' }));
    });

    it('does not override explicit type', async () => {
      setDefaultType('agent');
      const sdkCall = vi.fn().mockResolvedValue({});
      const handler = createToolHandler(typeSchema, sdkCall);

      await handler({ type: 'workflow', name: 'test' });
      expect(sdkCall).toHaveBeenCalledWith(expect.objectContaining({ type: 'workflow' }));
    });

    it('does not inject when session type is not set', async () => {
      const sdkCall = vi.fn().mockResolvedValue({});
      const handler = createToolHandler(typeSchema, sdkCall);

      await handler({ name: 'test' });
      const callArgs = sdkCall.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.type).toBeUndefined();
    });
  });

  describe('fields parameter', () => {
    it('filters response to requested fields', async () => {
      const sdkCall = vi.fn().mockResolvedValue({
        name: 'test',
        version: '1.0.0',
        status: 'published',
        description: 'A test definition',
      });
      const handler = createToolHandler(testSchema, sdkCall);

      const result = await handler({ definition_type: 'agent', fields: ['name', 'version'] });
      const parsed = JSON.parse(result.content[0].text) as Record<string, unknown>;
      expect(parsed).toEqual({ name: 'test', version: '1.0.0' });
    });

    it('does not filter when fields is not provided', async () => {
      const sdkCall = vi.fn().mockResolvedValue({
        name: 'test',
        status: 'published',
      });
      const handler = createToolHandler(testSchema, sdkCall);

      const result = await handler({ definition_type: 'agent' });
      const parsed = JSON.parse(result.content[0].text) as Record<string, unknown>;
      expect(parsed).toHaveProperty('status');
    });

    it('fields works correctly with postProcess (postProcess runs first)', async () => {
      const sdkCall = vi.fn().mockResolvedValue({
        name: 'test',
        yaml: 'very long yaml content...',
        version: '1.0.0',
      });
      const handler = createToolHandler(testSchema, sdkCall, {
        postProcess: (result) => {
          const r = result as Record<string, unknown>;
          return { ...r, yaml: '[trimmed]' };
        },
      });

      const result = await handler({ definition_type: 'agent', fields: ['name', 'yaml'] });
      const parsed = JSON.parse(result.content[0].text) as Record<string, unknown>;
      expect(parsed).toEqual({ name: 'test', yaml: '[trimmed]' });
      expect(parsed).not.toHaveProperty('version');
    });
  });
});

describe('extractFieldsParam', () => {
  it('extracts fields array from args', () => {
    const { cleanArgs, fields } = extractFieldsParam({ name: 'test', fields: ['name', 'version'] });
    expect(fields).toEqual(['name', 'version']);
    expect(cleanArgs).toEqual({ name: 'test' });
  });

  it('returns undefined fields when not present', () => {
    const { cleanArgs, fields } = extractFieldsParam({ name: 'test' });
    expect(fields).toBeUndefined();
    expect(cleanArgs).toEqual({ name: 'test' });
  });

  it('returns undefined fields for non-array fields value', () => {
    const { fields } = extractFieldsParam({ name: 'test', fields: 'not-an-array' });
    expect(fields).toBeUndefined();
  });

  it('returns undefined fields for empty array', () => {
    const { fields } = extractFieldsParam({ name: 'test', fields: [] });
    expect(fields).toBeUndefined();
  });

  it('filters non-string items from fields array', () => {
    const { fields } = extractFieldsParam({ name: 'test', fields: ['name', 42, 'version'] });
    expect(fields).toEqual(['name', 'version']);
  });

  it('passes through non-object args unchanged', () => {
    const { cleanArgs, fields } = extractFieldsParam('not-an-object');
    expect(cleanArgs).toBe('not-an-object');
    expect(fields).toBeUndefined();
  });

  it('passes through null args', () => {
    const { cleanArgs, fields } = extractFieldsParam(null);
    expect(cleanArgs).toBeNull();
    expect(fields).toBeUndefined();
  });
});

describe('filterResponseFields', () => {
  it('filters top-level object properties', () => {
    const data = { name: 'test', version: '1.0.0', status: 'published' };
    expect(filterResponseFields(data, ['name', 'version'])).toEqual({
      name: 'test',
      version: '1.0.0',
    });
  });

  it('filters items within array properties', () => {
    const data = {
      items: [
        { name: 'a', type: 'agent', status: 'published' },
        { name: 'b', type: 'command', status: 'draft' },
      ],
    };
    expect(filterResponseFields(data, ['name', 'status'])).toEqual({
      items: [
        { name: 'a', status: 'published' },
        { name: 'b', status: 'draft' },
      ],
    });
  });

  it('preserves pagination metadata even when not in fields', () => {
    const data = { items: [{ name: 'test' }], total: 1, limit: 20, offset: 0 };
    expect(filterResponseFields(data, ['name'])).toEqual({
      items: [{ name: 'test' }],
      total: 1,
      limit: 20,
      offset: 0,
    });
  });

  it('passes through non-object data unchanged', () => {
    expect(filterResponseFields('string', ['name'])).toBe('string');
    expect(filterResponseFields(null, ['name'])).toBeNull();
    expect(filterResponseFields(42, ['name'])).toBe(42);
  });

  it('returns empty object when no fields match', () => {
    expect(filterResponseFields({ a: 1, b: 2 }, ['x', 'y'])).toEqual({});
  });

  it('preserves non-object array items as-is', () => {
    const data = { tags: ['a', 'b', 'c'] };
    expect(filterResponseFields(data, ['value'])).toEqual({
      tags: ['a', 'b', 'c'],
    });
  });
});
