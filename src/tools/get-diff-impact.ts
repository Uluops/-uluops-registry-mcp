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
  // RG14: diff_versions uses from/to; this tool used from_version/to_version —
  // same concept, adjacent tools, a coin-flip for callers. Both spellings are
  // accepted here; from/to win when both are present (they match the sibling).
  from_version: z.string().min(1).optional(),
  to_version: z.string().min(1).optional(),
  from: z.string().min(1).optional().describe('Alias for from_version (matches diff_versions)'),
  to: z.string().min(1).optional().describe('Alias for to_version (matches diff_versions)'),
}).refine(
  (v) => Boolean(v.from ?? v.from_version) && Boolean(v.to ?? v.to_version),
  { message: "Provide the version pair as either from/to or from_version/to_version." },
);

export function registerGetDiffImpactTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_diff_impact',
    'Get structural diff combined with metric deltas between two definition versions. Accepts from/to (matching diff_versions) or from_version/to_version. Deltas are observational, not causal — caveats are always included.',
    (GetDiffImpactInputSchema as unknown as { innerType: () => z.ZodObject<z.ZodRawShape> }).innerType().shape,
    createToolHandler(GetDiffImpactInputSchema, (n) =>
      registryClient.analytics.getDiffImpact(n.type, n.name, n.from ?? n.fromVersion, n.to ?? n.toVersion)
    , { toolName: 'get_diff_impact' })
  );
}
