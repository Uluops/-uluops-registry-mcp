/**
 * publish_definition tool
 *
 * Publish a draft definition.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { trimDefinitionResponse } from '../utils/trim-definition.js';

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
    'Publish a draft definition version, making it available for use. The response surfaces non-fatal warnings (e.g. translation failure) under a top-level `warnings` array — callers should inspect it before assuming the definition is renderable.',
    PublishDefinitionInputSchema.shape,
    createToolHandler(PublishDefinitionInputSchema, async (n) => {
      const result = await registryClient.definitions.publish(n.type, n.name, n.version);
      // Trim the definition's large fields but preserve warnings at the top level
      // so the publisher sees `TRANSLATION_FAILED` etc. without scrolling through YAML.
      return {
        definition: trimDefinitionResponse(result.definition),
        warnings: result.warnings,
      };
    })
  );
}
