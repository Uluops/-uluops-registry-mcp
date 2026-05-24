import { describe, it, expect } from 'vitest';
import { trimDefinitionResponse } from '../utils/trim-definition.js';

describe('trimDefinitionResponse', () => {
  it('returns non-object input unchanged', () => {
    expect(trimDefinitionResponse(null)).toBeNull();
    expect(trimDefinitionResponse(undefined)).toBeUndefined();
    expect(trimDefinitionResponse('string')).toBe('string');
    expect(trimDefinitionResponse(42)).toBe(42);
  });

  it('trims yaml field to preview', () => {
    const input = { yaml: 'name: test\nversion: 1.0.0\ndescription: long content here', status: 'published' };
    const result = trimDefinitionResponse(input) as Record<string, unknown>;
    // Preview is first 25 chars + "... (N chars)"
    expect(result.yaml).toContain('...');
    expect(result.yaml).toContain(`(${String(input.yaml.length)} chars)`);
    expect(result.status).toBe('published');
  });

  it('trims runtimeMd field to preview', () => {
    const input = { runtimeMd: '# Agent\n\nThis is a long runtime markdown document with lots of content', hash: 'abc123' };
    const result = trimDefinitionResponse(input) as Record<string, unknown>;
    expect(result.runtimeMd).toContain('...');
    expect(result.runtimeMd).toContain('chars)');
    expect(result.hash).toBe('abc123');
  });

  it('trims both yaml and runtimeMd when present', () => {
    const input = {
      yaml: 'a'.repeat(100),
      runtimeMd: 'b'.repeat(200),
      name: 'test',
    };
    const result = trimDefinitionResponse(input) as Record<string, unknown>;
    expect(result.yaml).toContain('(100 chars)');
    expect(result.runtimeMd).toContain('(200 chars)');
    expect(result.name).toBe('test');
  });

  it('leaves objects without yaml/runtimeMd unchanged', () => {
    const input = { name: 'test', status: 'published', hash: 'abc' };
    const result = trimDefinitionResponse(input) as Record<string, unknown>;
    expect(result).toEqual(input);
  });

  it('ignores non-string yaml/runtimeMd fields', () => {
    const input = { yaml: 42, runtimeMd: null, name: 'test' };
    const result = trimDefinitionResponse(input) as Record<string, unknown>;
    expect(result.yaml).toBe(42);
    expect(result.runtimeMd).toBeNull();
  });

  it('does not mutate original object', () => {
    const input = { yaml: 'a'.repeat(100), name: 'test' };
    const originalYaml = input.yaml;
    trimDefinitionResponse(input);
    expect(input.yaml).toBe(originalYaml);
  });

  it('handles short yaml that fits within preview length', () => {
    const input = { yaml: 'short' };
    const result = trimDefinitionResponse(input) as Record<string, unknown>;
    expect(result.yaml).toContain('(5 chars)');
  });
});
