/**
 * upgrade_definition tool
 *
 * Upgrade a definition from legacy format.
 * Accepts either inline `yaml` or a `file_path` to read from disk.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { resolveYamlInput } from '../utils/read-yaml-file.js';

export const UpgradeDefinitionInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  yaml: z.string().min(1).max(500_000).optional(),
  file_path: z
    .string()
    .min(1)
    .max(1000)
    .describe('Path to a .yaml/.yml file on the MCP server host (read from the server\'s filesystem, not the caller\'s). Remote callers should pass yaml inline instead.')
    .optional(),
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
      registryClient.translation.upgradeDefinition(n.type, n.name, { yaml: n.yaml }),
      {
        preProcess: (input) => resolveYamlInput(input, { required: true }),
      }
    )
  );
}
