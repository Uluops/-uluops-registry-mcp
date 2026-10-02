/**
 * get_evolution tool
 *
 * Get version-over-version metrics with trend detection.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { CROSS_VERSION_CAVEAT } from './cross-version-caveat.js';

export const GetEvolutionInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
});

export function registerGetEvolutionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_evolution',
    'Get version-over-version metrics timeline with trend detection (improving/declining/stable/volatile/insufficient_data — read off the slope confidence interval; volatile = the interval spans both dead-zone edges, no direction supported) and confidence level.' + ' ' + CROSS_VERSION_CAVEAT,
    GetEvolutionInputSchema.shape,
    createToolHandler(GetEvolutionInputSchema, (n) =>
      registryClient.analytics.getEvolution(n.type, n.name)
    , { toolName: 'get_evolution' })
  );
}
