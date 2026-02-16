/**
 * validate_definition tool
 *
 * Validate YAML without storing.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ValidateDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  yaml: z.string().min(1),
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
      registryClient.validation.validate(n.type, n.yaml)
    )
  );
}
