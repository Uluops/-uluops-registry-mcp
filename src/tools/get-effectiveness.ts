/**
 * get_effectiveness tool
 *
 * Get effectiveness metrics for a definition: pass rate, scores, taxonomy, health score.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetEffectivenessInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1).optional(),
});

export function registerGetEffectivenessTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_effectiveness',
    'Get effectiveness metrics for a definition: pass rate, scores, taxonomy distribution, health score, and composition lift. Version defaults to latest.',
    GetEffectivenessInputSchema.shape,
    createToolHandler(GetEffectivenessInputSchema, (n) =>
      registryClient.analytics.getEffectiveness(n.type, n.name, n.version)
    )
  );
}
