/**
 * sync_models tool
 *
 * Sync model catalog (admin).
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const SyncModelsInputSchema = z.object({});

export function registerSyncModelsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'sync_models',
    'Sync the model catalog with upstream providers. Requires admin privileges.',
    SyncModelsInputSchema.shape,
    createToolHandler(SyncModelsInputSchema, () => registryClient.models.sync())
  );
}
