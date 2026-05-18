/**
 * check_forkable tool
 *
 * Check if a definition can be forked.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const CheckForkableInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
});

export function registerCheckForkableTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'check_forkable',
    'Check if a definition version can be forked.',
    CheckForkableInputSchema.shape,
    createToolHandler(CheckForkableInputSchema, (n) =>
      registryClient.forks.isForkable(n.type, n.name, n.version)
    )
  );
}
