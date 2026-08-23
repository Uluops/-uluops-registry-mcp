/**
 * render_definition tool
 *
 * Get rendered markdown for a definition.
 * Optionally write the markdown directly to a file via output_path.
 */

import { getDefaultType } from '../utils/session-state.js';
import { writeFile, mkdir, lstat, access } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import {
  DefinitionTypeWithDefaultSchema,
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
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  version: z.string().min(1).default('latest'),
  renderProfile: z
    .enum(['core', 'uluops-full'])
    .describe("Render profile. 'core' (default) is a clean prompt with no UluOps-specific sections. 'uluops-full' adds the failure taxonomy reference, failure-code guidance, tracker frontmatter, and JSON output block where the agent role supports them.")
    .optional(),
  target: z
    .string()
    .min(1)
    .describe('Target harness format (e.g., opencode, codex, gemini). Omit for canonical Claude Code output.')
    .optional(),
  model: z
    .string()
    .min(1)
    .describe('Model override for target envelope (e.g., gpt-5.3, gemini-3-preview).')
    .optional(),
  output_path: z
    .string()
    .min(1)
    .describe('Write rendered output to this file path instead of returning it in the response. Written on the MCP server host\'s filesystem, not the caller\'s — remote callers should omit this and take the rendered output from the response.')
    .optional(),
  overwrite: z
    .boolean()
    .describe('When true, allow output_path to overwrite an existing file. Defaults to false — an existing file at output_path produces an error response rather than being silently replaced.')
    .default(false),
});

export function registerRenderDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  const baseHandler = createToolHandler(RenderDefinitionInputSchema, (n) =>
    registryClient.render.get(n.type, n.name, n.version, {
      target: n.target,
      model: n.model,
      renderProfile: n.renderProfile,
    })
  );

  server.tool(
    'render_definition',
    'Get the rendered runtime output for a definition version. Use target to render for a specific harness (opencode, codex, gemini). Use output_path to write directly to a file.',
    RenderDefinitionInputSchema.shape,
    async (args: unknown) => {
      const parsed = RenderDefinitionInputSchema.safeParse(args);
      // RG4: this tool parses its own input, so resolve the session default
      // here (the shared handler guard does it for createToolHandler tools).
      const resolvedType = parsed.success ? (parsed.data.type ?? getDefaultType()) : undefined;
      if (parsed.success && resolvedType === undefined) {
        return createErrorResponse(
          "Missing 'type': pass it explicitly (agent, command, workflow, pipeline) or set a session default first with set_default_type.",
        );
      }
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

      // Refuse to silently overwrite an existing regular file unless the
      // caller has opted in with overwrite: true. Default-deny matches
      // `cp --no-clobber` semantics and prevents agent-driven hallucinated
      // paths from destroying user work without a clear signal.
      if (!parsed.data.overwrite) {
        const exists = await access(absPath).then(() => true).catch(() => false);
        if (exists) {
          return createErrorResponse(
            `output_path '${absPath}' already exists. Pass overwrite: true to replace it.`,
          );
        }
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

      // Narrow for the compiler: undefined resolvedType was either rejected
      // above (no session default) or delegated to baseHandler (parse failure).
      if (resolvedType === undefined) {
        return baseHandler(args);
      }

      try {
        const result = await registryClient.render.get(
          resolvedType,
          parsed.data.name,
          parsed.data.version,
          { target: parsed.data.target, model: parsed.data.model, renderProfile: parsed.data.renderProfile },
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
