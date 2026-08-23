/**
 * list_providers tool
 *
 * List AI model providers.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ListProvidersInputSchema = z.object({
  // RG9: the catalog holds ~197 providers (~55KB) — an unpaginated call
  // exceeded a single MCP response. Same contract as list_definitions.
  limit: z.number().int().min(1).max(200).optional().describe('Max providers per page (default 50, max 200)'),
  offset: z.number().int().min(0).optional().describe('Pagination offset'),
});

export function registerListProvidersTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'list_providers',
    'List AI model providers, paginated (limit default 50, max 200; offset). The response total is the whole catalog, not the page.',
    ListProvidersInputSchema.shape,
    createToolHandler(ListProvidersInputSchema, (n) => registryClient.models.listProviders({ limit: n.limit, offset: n.offset }))
  );
}
