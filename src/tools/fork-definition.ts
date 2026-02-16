/**
 * fork_definition tool
 *
 * Fork a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ForkDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
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
    'Fork a definition version under a new name.',
    ForkDefinitionInputSchema.shape,
    createToolHandler(ForkDefinitionInputSchema, (n) =>
      registryClient.forks.create(n.type, n.name, n.version, {
        name: n.newName,
        ...(n.description !== undefined && { description: n.description }),
      })
    )
  );
}
