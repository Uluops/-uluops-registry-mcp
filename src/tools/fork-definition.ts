/**
 * fork_definition tool
 *
 * Fork a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ForkDefinitionInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  new_name: z.string().min(1),
  description: z.string().optional(),
});

export function registerForkDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'fork_definition',
    'Fork a definition version under a new name. The fork starts at version 1.0.0 regardless of the source version (it is a new artifact with its own history). Its default display_name derives from the new name — pass display_name to override.',
    ForkDefinitionInputSchema.shape,
    createToolHandler(ForkDefinitionInputSchema, (n) =>
      registryClient.forks.create(n.type, n.name, n.version, {
        name: n.newName,
        ...(n.description !== undefined && { description: n.description }),
      })
    , { toolName: 'fork_definition' })
  );
}
