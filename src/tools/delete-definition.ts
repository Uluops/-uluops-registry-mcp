/**
 * delete_definition tool
 *
 * Delete a definition version. Blocked only if other definitions fork from or depend on it.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const DeleteDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
});

export function registerDeleteDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'delete_definition',
    'Delete a definition version. Blocked only if other definitions fork from or depend on it.',
    DeleteDefinitionInputSchema.shape,
    createToolHandler(DeleteDefinitionInputSchema, (n) =>
      registryClient.definitions.delete(n.type, n.name, n.version)
    )
  );
}
