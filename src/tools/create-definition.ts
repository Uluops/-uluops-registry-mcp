/**
 * create_definition tool
 *
 * Create a new draft definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import {
  DefinitionTypeSchema,
  VisibilitySchema,
  type McpServerToolRegistration,
} from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const CreateDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  yaml: z.string().min(1),
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
      })
    )
  );
}
