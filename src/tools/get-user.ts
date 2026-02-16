/**
 * get_user tool
 *
 * Get public user profile.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetUserInputSchema = z.object({
  id: z.string().min(1),
});

export function registerGetUserTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_user',
    'Get a public user profile by ID.',
    GetUserInputSchema.shape,
    createToolHandler(GetUserInputSchema, (n) =>
      registryClient.users.get(n.id)
    )
  );
}
