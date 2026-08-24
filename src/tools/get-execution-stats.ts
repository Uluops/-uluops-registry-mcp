/**
 * get_execution_stats tool
 *
 * Get execution statistics for a definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetExecutionStatsInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  // RG3: documented in DAYS, but the API parameter is MINUTES — window:7 used
  // to silently mean seven minutes, reported as a weekly figure. The tool
  // keeps the day-denominated contract and converts at this boundary.
  window: z.number().int().positive().max(365).optional(),
});

export function registerGetExecutionStatsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_execution_stats',
    "Get execution statistics for a definition version. Optional window parameter in DAYS (converted to the API's minute-denominated window; the response echoes windowMinutes).",
    GetExecutionStatsInputSchema.shape,
    createToolHandler(GetExecutionStatsInputSchema, (n) =>
      registryClient.executions.getStats(n.type, n.name, n.version, n.window === undefined ? undefined : n.window * 24 * 60)
    , { toolName: 'get_execution_stats' })
  );
}
