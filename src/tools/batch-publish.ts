/**
 * batch_publish tool
 *
 * Publish multiple definition versions in one call.
 * Continues on individual failures, returning both published and failed items.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration, createSuccessResponse } from '../types/index.js';
import { mapSdkErrorToMcp, mapZodErrorToMcp, extractErrorContext } from '../client/sdk-error-mapper.js';
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
            const { definition, warnings } = await registryClient.definitions.publish(def.type, def.name, def.version);
            const trimmed = trimDefinitionResponse(definition) as Record<string, unknown>;
            // Attach per-item warnings so a batch with one TRANSLATION_FAILED is
            // visible in the published list — otherwise the caller has to walk every
            // item against `risk_profile` / `runtime_md` to find which one is broken.
            published.push({ ...trimmed, warnings });
          } catch (error: unknown) {
            // Route per-item failures through extractErrorContext so the
            // batch response surfaces the same rich error metadata that
            // single-call tools get via mapSdkErrorToMcp: 402 upgradeUrl
            // and tier info, 429 retry_after, 409 nextAvailable.
            const ctx = extractErrorContext(error);
            const { message, ...rest } = ctx;
            failed.push({
              type: def.type,
              name: def.name,
              version: def.version,
              error: message,
              ...rest,
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
