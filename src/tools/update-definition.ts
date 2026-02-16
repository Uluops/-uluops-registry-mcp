/**
 * update_definition tool
 *
 * Update a draft definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import {
  DefinitionTypeSchema,
  VisibilitySchema,
  ChangeTypeSchema,
  type McpServerToolRegistration,
} from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const UpdateDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  yaml: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  change_type: ChangeTypeSchema.optional(),
});

export function registerUpdateDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'update_definition',
    'Update a draft definition version with new YAML, visibility, description, or tags.',
    UpdateDefinitionInputSchema.shape,
    createToolHandler(UpdateDefinitionInputSchema, (n) => {
      const body: Record<string, unknown> = {};
      if (n.yaml !== undefined) body.yaml = n.yaml;
      if (n.visibility !== undefined) body.visibility = n.visibility;
      if (n.description !== undefined) body.description = n.description;
      if (n.tags !== undefined) body.tags = n.tags;
      if (n.changeType !== undefined) body.changeType = n.changeType;
      return registryClient.definitions.update(n.type, n.name, n.version, body as any);
    })
  );
}
