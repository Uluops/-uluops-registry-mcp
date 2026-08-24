/**
 * get_evolution tool
 *
 * Get version-over-version metrics with trend detection.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

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
    'Get version-over-version metrics timeline with trend detection (improving/declining/stable) and confidence level.',
    GetEvolutionInputSchema.shape,
    createToolHandler(GetEvolutionInputSchema, (n) =>
      registryClient.analytics.getEvolution(n.type, n.name)
    , { toolName: 'get_evolution' })
  );
}
