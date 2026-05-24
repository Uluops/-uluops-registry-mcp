/**
 * get_fork_lineage tool
 *
 * Get fork ancestry chain.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetForkLineageInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
});

export function registerGetForkLineageTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_fork_lineage',
    'Get the fork ancestry chain for a definition version.',
    GetForkLineageInputSchema.shape,
    createToolHandler(GetForkLineageInputSchema, (n) =>
      registryClient.forks.getAncestry(n.type, n.name, n.version)
    )
  );
}
