/**
 * diff_versions tool
 *
 * Compare two versions of a definition (YAML diff).
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const DiffVersionsInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
});

export function registerDiffVersionsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'diff_versions',
    'Compare two versions of a definition, showing YAML differences.',
    DiffVersionsInputSchema.shape,
    createToolHandler(DiffVersionsInputSchema, (n) =>
      registryClient.versions.diff(
        n.type,
        n.name,
        n.from,
        n.to
      )
    )
  );
}
