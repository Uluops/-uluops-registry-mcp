/**
 * get_effectiveness tool
 *
 * Get effectiveness metrics for a definition: pass rate, scores, taxonomy, health score.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetEffectivenessInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  version: z.string().min(1).optional(),
});

export function registerGetEffectivenessTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_effectiveness',
    'Get effectiveness metrics for a definition: pass rate, scores, taxonomy distribution, health score, and composition lift. Version defaults to latest. Quality numbers (passRate/runAvgScore) are VOTER-WEIGHTED: one actor, one vote — a single account cannot dominate them with run volume. metrics.provenance reports who stands behind them: actorCount/voterCount (windowed), confidence (provisional until 3+ qualifying actors). Once qualifying executions exist it ALSO carries the independent vs selfReported split — then provenance.independent is the headline figure to quote (selfReported is the author rating their own definition); at zero executions those two fields are absent, and there is no headline figure to quote. uniqueUsers is the all-time distinct-actor count. For AGENTS, quality is participation-based (snapshot scores across every run the agent appears in, constituent or standalone) and passRate is null by design — a run-level gate result cannot be attributed to one constituent.',
    GetEffectivenessInputSchema.shape,
    createToolHandler(GetEffectivenessInputSchema, (n) =>
      registryClient.analytics.getEffectiveness(n.type, n.name, n.version)
    )
  );
}
