/**
 * list_versions tool
 *
 * List all versions of a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ListVersionsInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
});

export function registerListVersionsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'list_versions',
    'List all versions of a definition with their status and metadata.',
    ListVersionsInputSchema.shape,
    createToolHandler(ListVersionsInputSchema, (n) => registryClient.versions.list(n.type, n.name))
  );
}
