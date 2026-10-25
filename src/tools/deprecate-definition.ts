/**
 * deprecate_definition tool
 *
 * Deprecate a definition with reason and optional successor.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { trimDefinitionResponse } from '../utils/trim-definition.js';
import { API_DEPRECATION_REASON_MAX_CHARS, API_SUCCESSOR_PATTERN } from '../config/api-limits.js';

export const DeprecateDefinitionInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  reason: z.string().min(1).max(API_DEPRECATION_REASON_MAX_CHARS),
  successor: z.string().regex(API_SUCCESSOR_PATTERN, 'Successor must be name or name@version format').optional(),
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
      { toolName: 'deprecate_definition', postProcess: trimDefinitionResponse }
    )
  );
}
