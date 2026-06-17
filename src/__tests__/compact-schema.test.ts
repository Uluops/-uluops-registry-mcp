import { describe, it, expect } from 'vitest';
import { compactSchemaContent } from '../utils/compact-schema.js';

describe('compactSchemaContent', () => {
  it('splits $defs into a flat defs map and compacts root', () => {
    const result = compactSchemaContent({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example/adl',
      type: 'object',
      properties: { agent: { $ref: '#/$defs/agent' } },
      required: ['agent'],
      $defs: { agent: { type: 'object', properties: { name: { type: 'string' } } } },
    });

    expect(result.legend).toMatch(/compact/i);
    expect(result.defs).toHaveProperty('agent');
    // root keeps structure; the agent property is a required ref pointer
    const root = result.root as { props: Record<string, unknown> };
    expect(root.props.agent).toBe('req · →agent');
  });

  it('collapses a leaf field to a signature string with req, enum, and clipped description', () => {
    const result = compactSchemaContent({
      type: 'object',
      required: ['kind'],
      properties: {
        kind: {
          type: 'string',
          enum: ['a', 'b', 'c'],
          description: 'The kind discriminator. This second sentence is dropped.',
        },
        note: { type: 'string', description: 'Optional note' },
      },
    });
    const props = (result.root as { props: Record<string, unknown> }).props;
    expect(props.kind).toBe('req · string enum[a|b|c] · The kind discriminator');
    expect(props.note).toBe('string · Optional note');
  });

  it('renders $ref as a "→name" pointer', () => {
    const result = compactSchemaContent({
      type: 'object',
      properties: { scoring: { $ref: '#/$defs/scoring' } },
    });
    const props = (result.root as { props: Record<string, unknown> }).props;
    expect(props.scoring).toBe('→scoring');
  });

  it('renders arrays of scalars and refs as "array[...]"', () => {
    const result = compactSchemaContent({
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        cats: { type: 'array', items: { $ref: '#/$defs/category' } },
      },
    });
    const props = (result.root as { props: Record<string, unknown> }).props;
    expect(props.tags).toBe('array[string]');
    expect(props.cats).toBe('array[→category]');
  });

  it('preserves if/then conditionals and renders forbidden fields', () => {
    const result = compactSchemaContent({
      type: 'object',
      allOf: [
        {
          if: { properties: { agentType: { const: 'validator' } } },
          then: { properties: { tasks: false }, required: ['scoring'] },
        },
      ],
    });
    const root = result.root as {
      allOf: Array<{ if: unknown; then: { props?: Record<string, unknown>; require?: string[] } }>;
    };
    const branch = root.allOf[0];
    expect((branch.then.props as Record<string, unknown>).tasks).toBe('forbidden');
    // `then` carries both a forbidden prop and a required field
    expect(branch.then.require).toEqual(['scoring']);
  });

  it('keeps enums complete (never clipped)', () => {
    const longEnum = Array.from({ length: 14 }, (_, i) => `v${String(i)}`);
    const result = compactSchemaContent({
      type: 'object',
      properties: { domain: { type: 'string', enum: longEnum } },
    });
    const props = (result.root as { props: Record<string, unknown> }).props;
    expect(props.domain).toContain(`enum[${longEnum.join('|')}]`);
  });
});
