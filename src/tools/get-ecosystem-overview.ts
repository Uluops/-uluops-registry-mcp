/**
 * get_ecosystem_overview tool
 *
 * Get ecosystem-wide analytics overview.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { UNVERSIONED_FIGURES_CAVEAT } from './cross-version-caveat.js';

export const GetEcosystemOverviewInputSchema = z.object({});

export function registerGetEcosystemOverviewTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_ecosystem_overview',
    'Get ecosystem-wide overview: definition counts, aggregate health scores, top performers, and definitions needing attention.' + ' ' + UNVERSIONED_FIGURES_CAVEAT,
    GetEcosystemOverviewInputSchema.shape,
    createToolHandler(GetEcosystemOverviewInputSchema, () =>
      registryClient.analytics.getEcosystemOverview()
    , { toolName: 'get_ecosystem_overview', responseNote: UNVERSIONED_FIGURES_CAVEAT })
  );
}
