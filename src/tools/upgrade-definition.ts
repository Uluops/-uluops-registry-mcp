/**
 * upgrade_definition tool
 *
 * Upgrade a definition from legacy format.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const UpgradeDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  yaml: z.string().min(1),
});

export function registerUpgradeDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'upgrade_definition',
    'Upgrade a definition from legacy format to the current schema version.',
    UpgradeDefinitionInputSchema.shape,
    createToolHandler(UpgradeDefinitionInputSchema, (n) =>
      registryClient.translation.upgrade(n.type, n.name, { yaml: n.yaml })
    )
  );
}
