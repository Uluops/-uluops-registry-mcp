/**
 * list_forks tool
 *
 * List forks of a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ListForksInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  version: z.string().min(1).optional(),
});

export function registerListForksTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'list_forks',
    'List all forks of a definition version. Omit version to list forks of the latest published version.',
    ListForksInputSchema.shape,
    createToolHandler(ListForksInputSchema, (n) =>
      registryClient.forks.list(n.type, n.name, n.version)
    , { toolName: 'list_forks' })
  );
}
