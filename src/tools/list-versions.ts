/**
 * list_versions tool
 *
 * List all versions of a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ListVersionsInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});

export function registerListVersionsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'list_versions',
    'List all versions of a definition with their status and metadata.',
    ListVersionsInputSchema.shape,
    createToolHandler(ListVersionsInputSchema, (n) =>
      registryClient.versions.list(n.type, n.name, {
        ...(n.limit !== undefined && { limit: n.limit }),
        ...(n.offset !== undefined && { offset: n.offset }),
      })
    , { toolName: 'list_versions' })
  );
}
