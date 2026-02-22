/**
 * create_definition tool
 *
 * Create a new draft definition with YAML content.
 * Accepts either inline `yaml` or a `file_path` to read from disk.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import {
  DefinitionTypeSchema,
  VisibilitySchema,
  type McpServerToolRegistration,
} from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { resolveYamlInput } from '../utils/read-yaml-file.js';
import { trimDefinitionResponse } from '../utils/trim-definition.js';

export const CreateDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  yaml: z.string().min(1).max(500_000).optional(),
  file_path: z.string().min(1).max(1000).optional(),
  visibility: VisibilitySchema.optional(),
});

export function registerCreateDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'create_definition',
    'Create a new draft definition with YAML content.',
    CreateDefinitionInputSchema.shape,
    createToolHandler(CreateDefinitionInputSchema, (n) =>
      registryClient.definitions.create(n.type, n.name, {
        yaml: n.yaml,
        ...(n.visibility !== undefined && { visibility: n.visibility }),
      }),
      {
        preProcess: (input) => resolveYamlInput(input, { required: true }),
        postProcess: trimDefinitionResponse,
      }
    )
  );
}
