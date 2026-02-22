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
 * Typed as Record<string, unknown> rather than `any` — callers access fields
 * by name (e.g. `n.type`, `n.name`) which Zod has already validated.
 */
// SAFETY: `any` is allowed in this file (eslint config relaxes no-explicit-any for tool handlers).
// Zod validates structure before normalizeKeys() runs; TS can't track snake→camel key renaming.
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
    // SAFETY: Zod validates input structure before normalizeKeys() runs.
    // TypeScript cannot statically track the snake_case→camelCase key renaming.
    // Each tool extracts positional args (n.type, n.name, etc.) guaranteed valid by Zod.
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
      let input = schema.parse(args);

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
      return createSuccessResponse(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return mapZodErrorToMcp(error);
      }
      return mapSdkErrorToMcp(error);
    }
  };
}
