/**
 * archive_definition tool
 *
 * Archive a deprecated definition — terminal lifecycle state.
 * Removes from discovery but keeps the record resolvable by ID.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { trimDefinitionResponse } from '../utils/trim-definition.js';

export const ArchiveDefinitionInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  version: z.string().min(1),
});

export function registerArchiveDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'archive_definition',
    'Archive a deprecated definition. Terminal state — removes from discovery, keeps record resolvable by ID.',
    ArchiveDefinitionInputSchema.shape,
    createToolHandler(ArchiveDefinitionInputSchema, (n) =>
      registryClient.definitions.archive(n.type, n.name, n.version),
      { postProcess: trimDefinitionResponse }
    )
  );
}
