/**
 * list_forks tool
 *
 * List forks of a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ListForksInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
});

export function registerListForksTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'list_forks',
    'List all forks of a definition version.',
    ListForksInputSchema.shape,
    createToolHandler(ListForksInputSchema, (n) =>
      registryClient.forks.list(n.type, n.name, n.version)
    )
  );
}
