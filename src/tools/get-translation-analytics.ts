/**
 * get_translation_analytics tool
 *
 * Get versions grouped by translator version with aggregate metrics.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetTranslationAnalyticsInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
});

export function registerGetTranslationAnalyticsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_translation_analytics',
    'Get definition versions grouped by translator version with aggregate metrics (pass rate, score, run count). Shows translator impact on definition quality.',
    GetTranslationAnalyticsInputSchema.shape,
    createToolHandler(GetTranslationAnalyticsInputSchema, (n) =>
      registryClient.analytics.getTranslation(n.type, n.name)
    )
  );
}
