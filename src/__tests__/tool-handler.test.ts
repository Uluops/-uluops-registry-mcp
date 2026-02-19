import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createToolHandler } from '../utils/tool-handler.js';

describe('createToolHandler', () => {
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
    expect(sdkCall).toHaveBeenCalledWith(
      expect.objectContaining({ definitionType: 'AGENT' })
    );
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
    expect(sdkCall).toHaveBeenCalledWith(
      expect.objectContaining({ definitionType: 'modified' })
    );
  });
});
