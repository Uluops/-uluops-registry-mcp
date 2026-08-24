/**
 * get_model tool
 *
 * Get specific model details.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetModelInputSchema = z.object({
  provider: z.string().min(1),
  model_id: z.string().min(1),
});

export function registerGetModelTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_model',
    'Get details for a specific AI model by provider and model ID.',
    GetModelInputSchema.shape,
    createToolHandler(GetModelInputSchema, (n) => registryClient.models.get(n.provider, n.modelId), { toolName: 'get_model' })
  );
}
