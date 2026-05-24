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
});

export function registerBatchUsersTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'batch_users',
    'Batch lookup of public user profiles by IDs (max 100).',
    BatchUsersInputSchema.shape,
    createToolHandler(BatchUsersInputSchema, (n) => registryClient.users.batch(n.ids))
  );
}
