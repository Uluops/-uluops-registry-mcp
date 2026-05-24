/**
 * batch_publish tool
 *
 * Publish multiple definition versions in one call.
 * Continues on individual failures, returning both published and failed items.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration, createSuccessResponse } from '../types/index.js';
import { mapSdkErrorToMcp, mapZodErrorToMcp, sanitizeErrorMessage } from '../client/sdk-error-mapper.js';
import { trimDefinitionResponse } from '../utils/trim-definition.js';

const DefinitionRefSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
});

export const BatchPublishInputSchema = z.object({
  definitions: z.array(DefinitionRefSchema).min(1).max(20),
});

export function registerBatchPublishTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'batch_publish',
    'Publish multiple definition versions in one call. Returns results for each item; continues on individual failures.',
    BatchPublishInputSchema.shape,
    async (args: unknown) => {
      try {
        const input = BatchPublishInputSchema.parse(args);

        const published: Record<string, unknown>[] = [];
        const failed: Record<string, unknown>[] = [];

        for (const def of input.definitions) {
          try {
            const result = await registryClient.definitions.publish(def.type, def.name, def.version);
            const trimmed = trimDefinitionResponse(result) as Record<string, unknown>;
            published.push(trimmed);
          } catch (error: unknown) {
            const message = error instanceof Error
              ? sanitizeErrorMessage(error.message)
              : 'Unknown error';
            const statusCode = error && typeof error === 'object' && 'statusCode' in error
              ? (error as { statusCode: number }).statusCode
              : undefined;
            failed.push({
              type: def.type,
              name: def.name,
              version: def.version,
              error: message,
              ...(statusCode ? { status: statusCode } : {}),
            });
          }
        }

        return createSuccessResponse({
          published,
          failed,
          summary: `Published ${String(published.length)} of ${String(input.definitions.length)} definitions`,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return mapZodErrorToMcp(error);
        }
        return mapSdkErrorToMcp(error);
      }
    }
  );
}
