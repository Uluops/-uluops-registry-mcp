/**
 * Tool handler factory
 *
 * Creates standardized MCP tool handlers with consistent error handling.
 * Eliminates boilerplate across tool implementations.
 */

import { z } from 'zod';
import { mapSdkErrorToMcp, mapZodErrorToMcp, sanitizeErrorMessage } from '../client/sdk-error-mapper.js';
import { normalizeKeys } from './normalize-keys.js';
import { createSuccessResponse, createErrorResponse, type McpToolResponse } from '../types/index.js';
import { getDefaultType } from './session-state.js';

/**
 * Coerce string values to numbers for fields that the Zod schema expects as numeric.
 * MCP JSON-RPC sometimes serializes numeric parameters as strings (e.g., "50" instead of 50).
 * This runs before Zod validation to prevent spurious type errors at the boundary.
 */
function coerceNumericFields(args: unknown, schema: z.ZodSchema): unknown {
  if (typeof args !== 'object' || args === null) return args;
  if (!(schema instanceof z.ZodObject)) return args;

  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const obj = { ...(args as Record<string, unknown>) };

  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (key in obj && typeof obj[key] === 'string') {
      if (isNumericSchema(fieldSchema)) {
        const num = Number(obj[key]);
        if (!isNaN(num)) {
          obj[key] = num;
        }
      }
    }
  }
  return obj;
}

/**
 * Check if a Zod schema (possibly wrapped in optional/nullable/default) expects a number.
 * Uses Zod's public unwrap()/removeDefault() API rather than `_def.innerType`
 * to avoid coupling to Zod's private internals — those can rename across
 * minor Zod versions and break numeric coercion without compile-time warning.
 */
function isNumericSchema(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodNumber) return true;
  if (schema instanceof z.ZodOptional) return isNumericSchema(schema.unwrap());
  if (schema instanceof z.ZodNullable) return isNumericSchema(schema.unwrap());
  if (schema instanceof z.ZodDefault) return isNumericSchema(schema.removeDefault());
  return false;
}

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
    /** Tool name for error context (RG5). Included in error envelopes so MCP clients can attribute failures. */
    toolName?: string;
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

      let input = schema.parse(coerceNumericFields(injectedArgs, schema));

      // RG4 guard: `type` is now schema-optional so the session default can
      // actually apply (a required type was protocol-rejected before injection
      // ran, making set_default_type inert). When a tool declares `type` and
      // neither an explicit value nor a session default supplied one, say
      // exactly what to do — never forward a type-less call to the SDK.
      // Only tools whose `type` is the WithDefault flavor (formerly REQUIRED,
      // relaxed so the session default can apply) get the guard — list tools
      // carry a genuinely-optional `type` FILTER that must stay omittable.
      // The WithDefault schema is identified by its distinctive description.
      const shape = schema instanceof z.ZodObject ? (schema.shape as Record<string, z.ZodTypeAny>) : undefined;
      const typeRequiresDefault = shape?.['type']?.description?.includes('set_default_type') ?? false;
      if (typeRequiresDefault && (input as Record<string, unknown>)['type'] === undefined) {
        return createErrorResponse(
          "Missing 'type': pass it explicitly (agent, command, workflow, pipeline) or set a session default first with set_default_type.",
        );
      }

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

      // Apply field selection after all processing.
      // RG1: the projection had five silent failure modes, all 200s — unknown
      // names dropped (rows with no identity), sibling collections emptied,
      // wrapped payloads erased, mutations returning bare {}. Unknown names
      // are now REJECTED with the valid set listed, and single-object payloads
      // are projected instead of dropped.
      if (fields) {
        const universe = collectFieldUniverse(result);
        const unknown = fields.filter((f) => !universe.has(f));
        if (unknown.length > 0) {
          return createErrorResponse(
            `Unknown field(s) in 'fields': ${unknown.join(', ')}. ` +
            `Valid fields for this response: ${[...universe].sort().join(', ')}.`,
          );
        }
        result = filterResponseFields(result, fields);
      }

      return createSuccessResponse(result);
    } catch (error) {
      // Log errors to stderr for debugging (MCP transport uses stdout).
      // Sanitize through the same credential-redaction filter used for MCP
      // responses — SDK errors may embed API keys, session tokens, or URL
      // userinfo in their messages, and stderr is captured by the harness.
      const rawMsg = error instanceof Error ? error.message : String(error);
      const errorMsg = sanitizeErrorMessage(rawMsg).slice(0, 200);
      const errorType = error instanceof z.ZodError ? 'validation' :
        error instanceof Error ? error.constructor.name : 'unknown';
      process.stderr.write(
        `[mcp-tool-error] type=${errorType} message=${errorMsg}\n`
      );

      if (error instanceof z.ZodError) {
        return mapZodErrorToMcp(error, options?.toolName);
      }
      return mapSdkErrorToMcp(error, options?.toolName);
    }
  };
}

/**
 * Inject session-level default type into args if not explicitly provided.
 * Safe for blanket injection — Zod strips unknown keys from tools that don't declare `type`.
 */
export function injectSessionType(args: unknown): unknown {
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
 * Collect every field name a `fields` projection could legitimately request
 * from this response (RG1): top-level keys, keys of items in object-array
 * containers, and keys of single-object payloads one level down (wrapped
 * responses like {definition: {...}, warnings: []}).
 */
export function collectFieldUniverse(data: unknown): Set<string> {
  const universe = new Set<string>();
  if (typeof data !== 'object' || data === null) return universe;
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    universe.add(key);
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          for (const k of Object.keys(item as Record<string, unknown>)) universe.add(k);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const k of Object.keys(value as Record<string, unknown>)) universe.add(k);
    }
  }
  return universe;
}

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

    // Arrays holding objects are list containers ({items: [...]}) — keep the
    // key and project each item. A scalar array (a definition's `tags`) is
    // itself a leaf field, so it falls through to the membership test below;
    // treating every array as a container let unrequested scalar-array keys
    // leak past the filter (RE-PROBE-02 N3). Empty arrays stay container —
    // dropping `{items: []}` from a zero-result list would change its shape.
    if (
      Array.isArray(value) &&
      (value.length === 0 ||
        value.some((item) => typeof item === 'object' && item !== null))
    ) {
      const projectedItems = (value as unknown[]).map((item: unknown): unknown => {
        if (typeof item === 'object' && item !== null) {
          return pickFields(item as Record<string, unknown>, fields);
        }
        return item;
      });
      // RG1 mode 2: a sibling collection with a DIFFERENT schema (aliases next
      // to models) used to come back as N empty objects. If a non-empty
      // container matched nothing, drop the key — unless the caller asked for
      // the container itself by name. Empty arrays stay ({items: []} keeps its
      // shape for zero-result lists).
      const anyMatch = projectedItems.some(
        (item) => typeof item !== 'object' || item === null || Object.keys(item).length > 0,
      );
      if (value.length === 0 || anyMatch || fields.includes(key)) {
        result[key] = fields.includes(key) ? value : projectedItems;
      }
      continue;
    }

    // Single-object payloads (wrapped responses: {definition: {...}}, mutation
    // envelopes) are projection TARGETS, not opaque leaves (RG1 modes 3/4):
    // dropping them erased the payload and left mutations answering bare {}.
    // Project into them; keep the key when anything matched, or when the key
    // itself was requested (whole-object select).
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (fields.includes(key)) {
        result[key] = value;
        continue;
      }
      const projected = pickFields(value as Record<string, unknown>, fields);
      if (Object.keys(projected).length > 0) {
        result[key] = projected;
      }
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
