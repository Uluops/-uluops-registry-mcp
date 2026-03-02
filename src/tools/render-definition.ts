/**
 * render_definition tool
 *
 * Get rendered markdown for a definition.
 * Optionally write the markdown directly to a file via output_path.
 */

import { writeFile, mkdir, lstat } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import {
  DefinitionTypeSchema,
  type McpServerToolRegistration,
  createSuccessResponse,
  createErrorResponse,
} from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { mapSdkErrorToMcp, mapZodErrorToMcp } from '../client/sdk-error-mapper.js';

/**
 * Get the base directory for output_path containment.
 * Resolved paths must start with this directory to prevent path traversal (CWE-22).
 * Defaults to cwd if OUTPUT_BASE_DIR is not set.
 * Evaluated per-call so env var changes (e.g., in tests) take effect.
 */
function getOutputBaseDir(): string {
  return resolve(process.env['OUTPUT_BASE_DIR'] ?? process.cwd());
}

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
  const baseHandler = createToolHandler(RenderDefinitionInputSchema, (n) =>
    registryClient.render.get(n.type, n.name, n.version)
  );

  server.tool(
    'render_definition',
    'Get the rendered runtime markdown for a definition version. Use output_path to write directly to a file.',
    RenderDefinitionInputSchema.shape,
    async (args: unknown) => {
      const parsed = RenderDefinitionInputSchema.safeParse(args);
      if (!parsed.success || parsed.data.output_path === undefined) {
        return baseHandler(args);
      }

      // Validate output_path stays within OUTPUT_BASE_DIR
      const outputBaseDir = getOutputBaseDir();
      const absPath = resolve(parsed.data.output_path);
      if (!absPath.startsWith(outputBaseDir + '/') && absPath !== outputBaseDir) {
        return createErrorResponse(
          `output_path must resolve within ${outputBaseDir} — got ${absPath}`
        );
      }

      // Reject symlinks in output path to prevent symlink-following writes (CWE-59)
      const pathStat = await lstat(absPath).catch(() => null);
      if (pathStat?.isSymbolicLink() === true) {
        return createErrorResponse('output_path must not be a symbolic link');
      }

      // Verify no symlink in ancestor directories resolves outside the base dir
      const rel = relative(outputBaseDir, absPath);
      const segments = rel.split('/');
      let walkPath = outputBaseDir;
      for (const seg of segments.slice(0, -1)) {
        walkPath = resolve(walkPath, seg);
        const segStat = await lstat(walkPath).catch(() => null);
        if (segStat?.isSymbolicLink() === true) {
          return createErrorResponse('output_path contains a symbolic link in its directory path');
        }
      }

      try {
        const result = await registryClient.render.get(
          parsed.data.type,
          parsed.data.name,
          parsed.data.version
        );

        // SDK RenderResult guarantees markdown: string
        const { markdown } = result;
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
          return mapZodErrorToMcp(error);
        }
        return mapSdkErrorToMcp(error);
      }
    }
  );
}
