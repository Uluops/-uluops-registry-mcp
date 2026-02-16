/**
 * retranslate_definition tool
 *
 * Retranslate a definition with the latest translator version.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const RetranslateDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  force: z.boolean().optional(),
});

export function registerRetranslateDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'retranslate_definition',
    'Retranslate a definition version using the latest translator. Use force=true to retranslate even if already current.',
    RetranslateDefinitionInputSchema.shape,
    createToolHandler(RetranslateDefinitionInputSchema, (n) => {
      const options: Record<string, unknown> = {};
      if (n.force !== undefined) options.force = n.force;
      return registryClient.translation.retranslate(
        n.type,
        n.name,
        n.version,
        options
      );
    })
  );
}
