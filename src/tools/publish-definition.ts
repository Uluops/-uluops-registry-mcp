/**
 * publish_definition tool
 *
 * Publish a draft definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const PublishDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
});

export function registerPublishDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'publish_definition',
    'Publish a draft definition version, making it available for use.',
    PublishDefinitionInputSchema.shape,
    createToolHandler(PublishDefinitionInputSchema, (n) =>
      registryClient.definitions.publish(n.type, n.name, n.version)
    )
  );
}
