/**
 * Key normalization utilities for snake_case -> camelCase conversion
 *
 * MCP tool inputs use snake_case (matching the MCP protocol convention).
 * The SDK expects camelCase. This module provides recursive conversion.
 */

/**
 * Convert a single snake_case string to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

const MAX_DEPTH = 20;

/**
 * Recursively convert all object keys from snake_case to camelCase.
 */
export function normalizeKeys(input: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) {
    // Safety limit to prevent infinite recursion on circular references.
    // MCP tool inputs are shallow objects (typically 1-3 levels deep).
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => normalizeKeys(item, depth + 1));
  }
  if (input !== null && typeof input === 'object') {
    const result: Record<string, unknown> = {};
    // SAFETY: Non-null object is guaranteed by the guard above. Object.entries requires
    // Record<string, unknown> cast since `input` is typed as `object` (no index signature).
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[toCamelCase(key)] = normalizeKeys(value, depth + 1);
    }
    return result;
  }
  return input;
}
