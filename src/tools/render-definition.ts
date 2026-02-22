/**
 * render_definition tool
 *
 * Get rendered markdown for a definition.
 * Optionally write the markdown directly to a file via output_path.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import {
  DefinitionTypeSchema,
  type McpServerToolRegistration,
  createSuccessResponse,
  createErrorResponse,
} from '../types/index.js';


export const RenderDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  output_path: z
    .string()
    .min(1)
    .describe('Write rendered markdown to this file path instead of returning it in the response.')
    .optional(),
});

export function registerRenderDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'render_definition',
    'Get the rendered runtime markdown for a definition version. Use output_path to write directly to a file.',
    RenderDefinitionInputSchema.shape,
    async (args: unknown) => {
      try {
        const input = RenderDefinitionInputSchema.parse(args);
        const result = await registryClient.render.get(
          input.type,
          input.name,
          input.version
        );

        if (!input.output_path) {
          return createSuccessResponse(result);
        }

        const absPath = resolve(input.output_path);
        const markdown = (result as unknown as Record<string, unknown>).markdown;
        if (typeof markdown !== 'string') {
          return createErrorResponse(
            'Render result missing markdown field — cannot write to file.'
          );
        }

        await mkdir(dirname(absPath), { recursive: true });
        await writeFile(absPath, markdown, 'utf-8');

        return createSuccessResponse({
          success: true,
          output_path: absPath,
          bytes: Buffer.byteLength(markdown, 'utf-8'),
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const { mapZodErrorToMcp } = await import(
            '../client/sdk-error-mapper.js'
          );
          return mapZodErrorToMcp(error);
        }
        const { mapSdkErrorToMcp } = await import(
          '../client/sdk-error-mapper.js'
        );
        return mapSdkErrorToMcp(error);
      }
    }
  );
}
