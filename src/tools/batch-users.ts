/**
 * batch_users tool
 *
 * Batch user lookup (max 100).
 */

import { z } from 'zod';
import type { RegistryClient, BatchUserEnvelope, PublicUser } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { collectFieldUniverse, createToolHandler, filterResponseFields } from '../utils/tool-handler.js';

// PublicUser's documented fields stay selectable even when every profile is missing.
const PUBLIC_USER_FIELDS = ['id', 'username', 'name', 'bio', 'websiteUrl', 'avatar', 'avatarMimeType'] as const satisfies readonly (keyof PublicUser)[];

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
      : registryClient.users.batch(n.ids), {
      toolName: 'batch_users',
      fieldProjection: {
        collect: (result, input) => input.format === 'envelope'
          ? new Set(['data', 'foundIds', 'missingIds', ...PUBLIC_USER_FIELDS])
          : collectFieldUniverse(result),
        filter: (result, fields, input) => {
          if (input.format !== 'envelope') return filterResponseFields(result, fields);
          const envelope = result as BatchUserEnvelope;
          const data = fields.includes('data') ? envelope.data : Object.fromEntries(
            Object.entries(envelope.data).map(([id, profile]) => [
              id,
              profile == null ? profile : Object.fromEntries(
                Object.entries(profile).filter(([field]) => fields.includes(field)),
              ),
            ]),
          );
          return { data, foundIds: envelope.foundIds, missingIds: envelope.missingIds };
        },
      },
    })
  );
}
