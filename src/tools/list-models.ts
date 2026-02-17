/**
 * list_models tool
 *
 * List AI models with optional filters.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import {
  ModelTierSchema,
  ModelStatusSchema,
  type McpServerToolRegistration,
} from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ListModelsInputSchema = z.object({
  provider: z.string().optional(),
  tier: ModelTierSchema.optional(),
  status: ModelStatusSchema.optional(),
});

export function registerListModelsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'list_models',
    'List available AI models with optional provider, tier, and status filters.',
    ListModelsInputSchema.shape,
    createToolHandler(ListModelsInputSchema, (n) =>
      registryClient.models.list(n)
    )
  );
}
