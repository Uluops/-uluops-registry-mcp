/**
 * render_definition tool
 *
 * Get rendered markdown for a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const RenderDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
});

export function registerRenderDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'render_definition',
    'Get the rendered runtime markdown for a definition version.',
    RenderDefinitionInputSchema.shape,
    createToolHandler(RenderDefinitionInputSchema, (n) =>
      registryClient.render.get(n.type, n.name, n.version)
    )
  );
}
