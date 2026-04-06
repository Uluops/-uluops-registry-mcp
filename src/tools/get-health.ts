/**
 * get_health tool
 *
 * Get health grade and issue profile for a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetHealthInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1).optional(),
});

export function registerGetHealthTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_health',
    'Get health grade (A-F), issue profile, and contributing factors for a definition. Health scores are provisional. Version defaults to latest.',
    GetHealthInputSchema.shape,
    createToolHandler(GetHealthInputSchema, (n) =>
      registryClient.analytics.getHealth(n.type, n.name, n.version)
    )
  );
}
