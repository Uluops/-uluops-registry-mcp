import { describe, it, expect } from 'vitest';
import { normalizeKeys } from '../utils/normalize-keys.js';

describe('normalizeKeys', () => {
  it('converts snake_case keys to camelCase', () => {
    const input = { include_yaml: true, definition_type: 'agent' };
    expect(normalizeKeys(input)).toEqual({ includeYaml: true, definitionType: 'agent' });
  });

  it('handles nested objects recursively', () => {
    const input = { outer_key: { inner_key: 'value', deep_key: { nested_val: 1 } } };
    expect(normalizeKeys(input)).toEqual({
      outerKey: { innerKey: 'value', deepKey: { nestedVal: 1 } },
    });
  });

  it('handles arrays of objects', () => {
    const input = [{ some_key: 1 }, { other_key: 2 }];
    expect(normalizeKeys(input)).toEqual([{ someKey: 1 }, { otherKey: 2 }]);
  });

  it('handles arrays inside objects', () => {
    const input = { tag_list: [{ tag_name: 'a' }, { tag_name: 'b' }] };
    expect(normalizeKeys(input)).toEqual({
      tagList: [{ tagName: 'a' }, { tagName: 'b' }],
    });
  });

  it('preserves primitive values', () => {
    expect(normalizeKeys('hello')).toBe('hello');
    expect(normalizeKeys(42)).toBe(42);
    expect(normalizeKeys(true)).toBe(true);
    expect(normalizeKeys(null)).toBeNull();
    expect(normalizeKeys(undefined)).toBeUndefined();
  });

  it('handles empty objects and arrays', () => {
    expect(normalizeKeys({})).toEqual({});
    expect(normalizeKeys([])).toEqual([]);
  });

  it('handles keys already in camelCase', () => {
    const input = { alreadyCamel: 'value' };
    expect(normalizeKeys(input)).toEqual({ alreadyCamel: 'value' });
  });

  it('handles keys with multiple underscores', () => {
    const input = { this_is_a_long_key: 'value' };
    expect(normalizeKeys(input)).toEqual({ thisIsALongKey: 'value' });
  });

  it('handles keys with numbers after underscores', () => {
    const input = { page_1_limit: 10 };
    expect(normalizeKeys(input)).toEqual({ page1Limit: 10 });
  });

  it('handles mixed arrays of primitives and objects', () => {
    const input = ['string', 42, { some_key: true }, null];
    expect(normalizeKeys(input)).toEqual(['string', 42, { someKey: true }, null]);
  });

  it('stops recursion at max depth and returns input as-is', () => {
    // Build a deeply nested object (25 levels deep, beyond the 20 limit)
    let deep: Record<string, unknown> = { leaf_key: 'value' };
    for (let i = 0; i < 25; i++) {
      deep = { ['level_' + String(i)]: deep };
    }
    const result = normalizeKeys(deep) as Record<string, unknown>;
    // Top levels should be converted (snake_case -> camelCase)
    expect(result).toHaveProperty('level24');
  });

  it('does not convert keys beyond max depth', () => {
    // Build exactly 21 levels (depth 0-20), so the innermost object hits depth > 20
    let deep: Record<string, unknown> = { leaf_key: 'value' };
    for (let i = 0; i < 21; i++) {
      deep = { [`level_${String(i)}`]: deep };
    }
    // Drill down to the leaf through the result
    let node = normalizeKeys(deep) as Record<string, unknown>;
    for (let i = 20; i >= 1; i--) {
      node = node[`level${String(i)}`] as Record<string, unknown>;
    }
    // At depth 21, the innermost key should NOT be converted (still snake_case)
    const innermost = node.level0 as Record<string, unknown>;
    expect(innermost).toHaveProperty('leaf_key');
    expect(innermost).not.toHaveProperty('leafKey');
  });

  it('does not mutate the original input', () => {
    const input = { snake_key: 'value', nested: { inner_key: 42 } };
    const inputCopy = JSON.parse(JSON.stringify(input));
    normalizeKeys(input);
    expect(input).toEqual(inputCopy);
  });
});
