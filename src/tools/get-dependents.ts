/**
 * get_dependents tool
 *
 * Get reverse dependency graph for a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetDependentsInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
});

export function registerGetDependentsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_dependents',
    'Get the reverse dependency graph — what depends on this definition version.',
    GetDependentsInputSchema.shape,
    createToolHandler(GetDependentsInputSchema, (n) =>
      registryClient.dependencies.getDependents(n.type, n.name, n.version)
    )
  );
}
