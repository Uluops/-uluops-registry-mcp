/**
 * compare_effectiveness tool
 *
 * Compare effectiveness across 2-5 definition versions side-by-side.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const CompareEffectivenessInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  versions: z.array(z.string().min(1)).min(2).max(5),
});

export function registerCompareEffectivenessTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'compare_effectiveness',
    'Compare effectiveness metrics across 2-5 definition versions side-by-side: pass rate, avg score, run count, health score, and translator version.',
    CompareEffectivenessInputSchema.shape,
    createToolHandler(CompareEffectivenessInputSchema, (n) =>
      registryClient.analytics.compare(n.type, n.name, n.versions)
    )
  );
}
