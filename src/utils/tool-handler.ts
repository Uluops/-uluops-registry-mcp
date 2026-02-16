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

/**
 * Creates a standardized tool handler with Zod validation, key normalization,
 * and SDK error mapping.
 *
 * All handlers follow the same flow:
 * 1. Parse input with Zod schema (validates snake_case MCP input)
 * 2. Normalize keys from snake_case -> camelCase for SDK
 * 3. Call SDK method with normalized input
 * 4. Return success response or mapped error
 */
export function createToolHandler<TInput>(
  schema: z.ZodSchema<TInput>,
  sdkCall: (normalized: any) => Promise<unknown>,
  options?: {
    /** Transform parsed input before normalization. Return McpToolResponse to short-circuit. */
    preProcess?: (input: TInput) => TInput | McpToolResponse;
  }
): (args: unknown) => Promise<McpToolResponse> {
  return async (args: unknown): Promise<McpToolResponse> => {
    try {
      let input = schema.parse(args);

      if (options?.preProcess) {
        const preResult = options.preProcess(input);
        if ('content' in (preResult as McpToolResponse)) {
          return preResult as McpToolResponse;
        }
        input = preResult as TInput;
      }

      const normalized = normalizeKeys(input) as Record<string, unknown>;
      const result = await sdkCall(normalized);
      return createSuccessResponse(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return mapZodErrorToMcp(error);
      }
      return mapSdkErrorToMcp(error);
    }
  };
}
