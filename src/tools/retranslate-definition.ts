/**
 * retranslate_definition tool
 *
 * Retranslate a definition with the latest translator version.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const RetranslateDefinitionInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
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
    'Retranslate a definition version using the latest translator. Use force=true to retranslate even if already current. The response carries changed:boolean — false means the work ran and produced identical artifacts (a correct no-op), distinguishing it from work that silently did not happen.',
    RetranslateDefinitionInputSchema.shape,
    createToolHandler(RetranslateDefinitionInputSchema, (n) => {
      const options: Record<string, unknown> = {};
      if (n.force !== undefined) options.createNewVersion = n.force;
      return registryClient.translation.retranslate(n.type, n.name, n.version, options);
    }, { toolName: 'retranslate_definition' })
  );
}
