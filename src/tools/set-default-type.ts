/**
 * set_default_type tool
 *
 * Set or clear a session-level default for the `type` parameter.
 * When set, definition tools use this type unless explicitly overridden.
 * Omit `type` to clear the default.
 */

import { z } from 'zod';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { setDefaultType, getSessionState } from '../utils/session-state.js';
import { createSuccessResponse, type McpToolResponse } from '../types/index.js';
import { mapZodErrorToMcp } from '../client/sdk-error-mapper.js';

const SetDefaultTypeSchema = z.object({
  type: DefinitionTypeSchema.optional(),
});

export function registerSetDefaultTypeTool(server: McpServerToolRegistration): void {
  server.tool(
    'set_default_type',
    'Set or clear a session-level default for the `type` parameter. When set, definition tools use this type unless explicitly overridden. Omit `type` to clear the default.',
    SetDefaultTypeSchema.shape,
    (args: unknown): Promise<McpToolResponse> => {
      try {
        const input = SetDefaultTypeSchema.parse(args);
        setDefaultType(input.type);
        return Promise.resolve(createSuccessResponse(getSessionState()));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return Promise.resolve(mapZodErrorToMcp(error));
        }
        throw error;
      }
    }
  );
}
