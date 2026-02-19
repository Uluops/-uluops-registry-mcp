/**
 * get_dependencies tool
 *
 * Get forward dependency graph for a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetDependenciesInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  depth: z.number().int().positive().optional(),
});

export function registerGetDependenciesTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_dependencies',
    'Get the forward dependency graph for a definition version.',
    GetDependenciesInputSchema.shape,
    createToolHandler(GetDependenciesInputSchema, (n) => {
      const options: Record<string, unknown> = {};
      if (n.depth !== undefined) options.maxDepth = n.depth;
      return registryClient.dependencies.get(n.type, n.name, n.version, options);
    })
  );
}
