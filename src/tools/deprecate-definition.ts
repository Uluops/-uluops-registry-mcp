/**
 * deprecate_definition tool
 *
 * Deprecate a definition with reason and optional successor.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { trimDefinitionResponse } from '../utils/trim-definition.js';

export const DeprecateDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  reason: z.string().min(1),
  successor: z.string().optional(),
});

export function registerDeprecateDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'deprecate_definition',
    'Deprecate a definition version with a reason and optional successor.',
    DeprecateDefinitionInputSchema.shape,
    createToolHandler(DeprecateDefinitionInputSchema, (n) =>
      registryClient.definitions.deprecate(n.type, n.name, n.version, {
        reason: n.reason,
        ...(n.successor !== undefined && { successor: n.successor }),
      }),
      { postProcess: trimDefinitionResponse }
    )
  );
}
