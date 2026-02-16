/**
 * get_execution_stats tool
 *
 * Get execution statistics for a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetExecutionStatsInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  window: z.number().int().positive().optional(),
});

export function registerGetExecutionStatsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_execution_stats',
    'Get execution statistics for a definition version. Optional window parameter (days).',
    GetExecutionStatsInputSchema.shape,
    createToolHandler(GetExecutionStatsInputSchema, (n) =>
      registryClient.executions.getStats(
        n.type,
        n.name,
        n.version,
        n.window
      )
    )
  );
}
