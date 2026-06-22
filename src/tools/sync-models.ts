/**
 * sync_models tool
 *
 * Sync model catalog (admin). Calls the registry API directly
 * via native fetch — this is an admin-only endpoint not exposed
 * through the public SDK.
 */

import { z } from 'zod';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const SyncModelsInputSchema = z.object({});

export function registerSyncModelsTool(
  server: McpServerToolRegistration,
): void {
  server.tool(
    'sync_models',
    'Sync the model catalog with upstream providers. Requires admin privileges.',
    SyncModelsInputSchema.shape,
    createToolHandler(SyncModelsInputSchema, async () => {
      const baseUrl = process.env['ULUOPS_REGISTRY_URL'] ?? 'https://api.uluops.ai/api/v1/registry';
      const apiKey = process.env['ULUOPS_API_KEY'];
      if (!apiKey) {
        throw new Error('ULUOPS_API_KEY is required for sync_models');
      }

      const res = await fetch(`${baseUrl}/models/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Sync failed (${String(res.status)}): ${body}`);
      }

      return res.json();
    })
  );
}
