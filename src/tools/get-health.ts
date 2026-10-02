/**
 * get_health tool
 *
 * Get health grade and issue profile for a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { POOLED_VERSIONS_CAVEAT } from './cross-version-caveat.js';

export const GetHealthInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  version: z.string().min(1).optional(),
});

export function registerGetHealthTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_health',
    'Get health grade (A-F), issue profile, and contributing factors for a definition. Health scores are provisional (weight tables pending calibration). The pass-rate factor only feeds health when 3+ qualifying actors stand behind it (voter-weighted, actor-diversity gated) — thin-actor definitions read as insufficient-data rather than confidently scored. Version defaults to latest.' + ' ' + POOLED_VERSIONS_CAVEAT,
    GetHealthInputSchema.shape,
    createToolHandler(GetHealthInputSchema, (n) =>
      registryClient.analytics.getHealth(n.type, n.name, n.version)
    , { toolName: 'get_health', responseNote: POOLED_VERSIONS_CAVEAT })
  );
}
