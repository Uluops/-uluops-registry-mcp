/**
 * compare_effectiveness tool
 *
 * Compare effectiveness across 2-5 definition versions side-by-side.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const CompareEffectivenessInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  quality_contract: z.literal('nullable-v1').optional().describe('Preserve absent gate rates as null with run-weighted basis, gate denominator and fraction units; requires advertised server support'),
  versions: z.array(z.string().min(1)).min(2).max(5),
});

export function registerCompareEffectivenessTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'compare_effectiveness',
    'Compare effectiveness metrics across 2-5 definition versions side-by-side: pass rate, avg score, run count, health score, and translator version. Select quality_contract=nullable-v1 for truthful absent gate rates; agent gate rates are null and scores remain a separate metric.',
    CompareEffectivenessInputSchema.shape,
    createToolHandler(CompareEffectivenessInputSchema, (n) =>
      registryClient.analytics.compare(n.type, n.name, n.versions, n.qualityContract === 'nullable-v1' ? { qualityContract: n.qualityContract } : undefined)
    , { toolName: 'compare_effectiveness' })
  );
}
