/**
 * validate_definition tool
 *
 * Validate YAML without storing.
 * Accepts either inline `yaml` or a `file_path` to read from disk.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { resolveYamlInput } from '../utils/read-yaml-file.js';

export const ValidateDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  yaml: z.string().min(1).max(500_000).optional(),
  file_path: z
    .string()
    .min(1)
    .max(1000)
    .describe('Path to a .yaml/.yml file on the MCP server host (read from the server\'s filesystem, not the caller\'s). Remote callers should pass yaml inline instead.')
    .optional(),
});

export function registerValidateDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'validate_definition',
    'Validate a definition YAML without storing it. Returns validation errors if any.',
    ValidateDefinitionInputSchema.shape,
    createToolHandler(ValidateDefinitionInputSchema, (n) =>
      registryClient.validation.validate(n.type, n.yaml),
      {
        preProcess: (input) => resolveYamlInput(input, { required: true }),
      }
    )
  );
}
