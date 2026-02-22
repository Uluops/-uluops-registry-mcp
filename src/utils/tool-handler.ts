/**
 * Tool handler factory
 *
 * Creates standardized MCP tool handlers with consistent error handling.
 * Eliminates boilerplate across tool implementations.
 */

import { z } from 'zod';
import { mapSdkErrorToMcp, mapZodErrorToMcp } from '../client/sdk-error-mapper.js';
import { normalizeKeys } from './normalize-keys.js';
import { createSuccessResponse, type McpToolResponse } from '../types/index.js';
import { getDefaultType } from './session-state.js';

/** Type guard: checks if a value is a complete MCP tool response (has content array). */
function isMcpToolResponse(value: unknown): value is McpToolResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'content' in value &&
    Array.isArray((value as McpToolResponse).content)
  );
}

/**
 * Normalized input after snake_case→camelCase key transformation.
 *
 * Uses `any` deliberately — Zod validates structure before normalizeKeys() runs,
 * but TypeScript cannot statically track the snake_case→camelCase key renaming.
 * Callers access fields positionally (e.g. `n.type`, `n.name`) which are
 * guaranteed valid by the preceding Zod parse. `Record<string, unknown>` was
 * evaluated but rejected: it requires explicit casts in all 31 tool callbacks
 * for SDK methods expecting specific types (string, number, enum literals).
 *
 * @see normalizeKeys in normalize-keys.ts
 */
type NormalizedInput = any;

/**
 * Creates a standardized tool handler with Zod validation, key normalization,
 * and SDK error mapping.
 *
 * All handlers follow the same flow:
 * 1. Parse input with Zod schema (validates snake_case MCP input)
 * 2. Normalize keys from snake_case -> camelCase for SDK
 * 3. Call SDK method with normalized input
 * 4. Return success response or mapped error
 *
 * Timeout enforcement is handled by the RegistryClient SDK (configured via
 * ULUOPS_REGISTRY_TIMEOUT env var, default 30s). No additional timeout is
 * needed at this layer.
 */
export function createToolHandler<TInput extends Record<string, unknown>>(
  schema: z.ZodSchema<TInput>,
  sdkCall: (
    // SAFETY: `any` is intentional — see NormalizedInput type alias above.
    // Zod validates structure, normalizeKeys() renames keys. Each tool extracts
    // positional args (n.type, n.name, etc.) guaranteed valid by the Zod parse.
    normalized: NormalizedInput
  ) => Promise<unknown>,
  options?: {
    /** Transform parsed input before normalization. Must be synchronous (MCP SDK constraint). Return McpToolResponse to short-circuit. */
    preProcess?: (input: TInput) => TInput | McpToolResponse;
    /** Transform SDK result before wrapping in success response. Use to trim large fields. */
    postProcess?: (result: unknown) => unknown;
  }
): (args: unknown) => Promise<McpToolResponse> {
  return async (args: unknown): Promise<McpToolResponse> => {
    try {
      // Extract fields param before Zod parse (meta-parameter, not part of tool schemas)
      const { cleanArgs, fields } = extractFieldsParam(args);

      // Inject session-level default type if not explicitly provided
      const injectedArgs = injectSessionType(cleanArgs);

      let input = schema.parse(injectedArgs);

      if (options?.preProcess) {
        const preResult = options.preProcess(input);
        if (isMcpToolResponse(preResult)) {
          return preResult;
        }
        input = preResult;
      }

      const normalized = normalizeKeys(input) as Record<string, unknown>;
      let result = await sdkCall(normalized);
      if (options?.postProcess) {
        result = options.postProcess(result);
      }

      // Apply field selection after all processing
      if (fields) {
        result = filterResponseFields(result, fields);
      }

      return createSuccessResponse(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return mapZodErrorToMcp(error);
      }
      return mapSdkErrorToMcp(error);
    }
  };
}

/**
 * Inject session-level default type into args if not explicitly provided.
 * Safe for blanket injection — Zod strips unknown keys from tools that don't declare `type`.
 */
function injectSessionType(args: unknown): unknown {
  const sessionType = getDefaultType();
  if (!sessionType) return args;

  if (typeof args === 'object' && args !== null) {
    const obj = args as Record<string, unknown>;
    if (obj.type === undefined || obj.type === null) {
      return { ...obj, type: sessionType };
    }
  }
  return args;
}

/**
 * Extract the `fields` meta-parameter from raw args before Zod validation.
 * Removes it from the args so Zod doesn't reject it as an unknown key.
 */
export function extractFieldsParam(args: unknown): {
  cleanArgs: unknown;
  fields: string[] | undefined;
} {
  if (typeof args !== 'object' || args === null) {
    return { cleanArgs: args, fields: undefined };
  }

  const obj = args as Record<string, unknown>;
  if (!('fields' in obj) || !Array.isArray(obj.fields)) {
    return { cleanArgs: args, fields: undefined };
  }

  const fields = obj.fields.filter((f): f is string => typeof f === 'string');
  const rest = Object.fromEntries(Object.entries(obj).filter(([k]) => k !== 'fields'));
  if (fields.length === 0) {
    return { cleanArgs: rest, fields: undefined };
  }

  return { cleanArgs: rest, fields };
}

/** Keys that represent pagination metadata and are always preserved. */
const PAGINATION_KEYS = new Set(['total', 'limit', 'offset', 'hasMore', 'page', 'totalPages']);

/**
 * Filter response fields to only include requested properties.
 * Preserves pagination metadata. For array properties, picks fields from each item.
 */
export function filterResponseFields(data: unknown, fields: string[]): unknown {
  if (typeof data !== 'object' || data === null) return data;

  const obj = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Always preserve pagination metadata
    if (PAGINATION_KEYS.has(key)) {
      result[key] = value;
      continue;
    }

    // For array values, pick fields from each item
    if (Array.isArray(value)) {
      result[key] = (value as unknown[]).map((item: unknown): unknown => {
        if (typeof item === 'object' && item !== null) {
          return pickFields(item as Record<string, unknown>, fields);
        }
        return item;
      });
      continue;
    }

    // Include top-level keys that match the fields list
    if (fields.includes(key)) {
      result[key] = value;
    }
  }

  return result;
}

/** Pick specified fields from an object. */
function pickFields(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
}
