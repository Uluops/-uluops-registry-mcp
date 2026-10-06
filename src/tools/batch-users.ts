/**
 * batch_users tool
 *
 * Batch user lookup (max 100).
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const BatchUsersInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  format: z.enum(['map', 'envelope']).optional(),
});

export function registerBatchUsersTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'batch_users',
    'Batch lookup of public user profiles by IDs (max 100). Optional format=envelope returns data, foundIds and missingIds with lowercase UUIDs deduplicated in request order; default is a map.',
    BatchUsersInputSchema.shape,
    createToolHandler(BatchUsersInputSchema, (n) => n.format === 'envelope'
      ? registryClient.users.batch(n.ids, { format: 'envelope' })
      : registryClient.users.batch(n.ids), { toolName: 'batch_users' })
  );
}
