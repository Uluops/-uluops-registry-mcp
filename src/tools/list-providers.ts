/**
 * list_providers tool
 *
 * List AI model providers.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ListProvidersInputSchema = z.object({});

export function registerListProvidersTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'list_providers',
    'List all available AI model providers.',
    ListProvidersInputSchema.shape,
    createToolHandler(ListProvidersInputSchema, () => registryClient.models.listProviders())
  );
}
