/**
 * get_diff_impact tool
 *
 * Get structural diff combined with metric deltas between two versions.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetDiffImpactInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  from_version: z.string().min(1),
  to_version: z.string().min(1),
});

export function registerGetDiffImpactTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_diff_impact',
    'Get structural diff combined with metric deltas between two definition versions. Deltas are observational, not causal — caveats are always included.',
    GetDiffImpactInputSchema.shape,
    createToolHandler(GetDiffImpactInputSchema, (n) =>
      registryClient.analytics.getDiffImpact(n.type, n.name, n.fromVersion, n.toVersion)
    )
  );
}
