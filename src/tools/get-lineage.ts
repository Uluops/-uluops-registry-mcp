/**
 * get_lineage tool
 *
 * Get the lineage graph for a definition: versions and forks as a tree.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { CROSS_VERSION_CAVEAT } from './cross-version-caveat.js';

export const GetLineageInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
});

export function registerGetLineageTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_lineage',
    'Get the lineage graph for a definition: versions and forks as a tree with health scores per node.' + ' ' + CROSS_VERSION_CAVEAT,
    GetLineageInputSchema.shape,
    createToolHandler(GetLineageInputSchema, (n) =>
      registryClient.analytics.getLineage(n.type, n.name)
    , { toolName: 'get_lineage' })
  );
}
