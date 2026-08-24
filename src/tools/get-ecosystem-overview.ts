/**
 * get_ecosystem_overview tool
 *
 * Get ecosystem-wide analytics overview.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetEcosystemOverviewInputSchema = z.object({});

export function registerGetEcosystemOverviewTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_ecosystem_overview',
    'Get ecosystem-wide overview: definition counts, aggregate health scores, top performers, and definitions needing attention.',
    GetEcosystemOverviewInputSchema.shape,
    createToolHandler(GetEcosystemOverviewInputSchema, () =>
      registryClient.analytics.getEcosystemOverview()
    , { toolName: 'get_ecosystem_overview' })
  );
}
