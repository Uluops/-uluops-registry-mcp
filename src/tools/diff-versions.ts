/**
 * diff_versions tool
 *
 * Compare two versions of a definition (YAML diff).
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeWithDefaultSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const DiffVersionsInputSchema = z.object({
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  full: z.boolean().default(false),
  format: z.enum(['sections', 'fields', 'unified']).default('sections'),
});

export function registerDiffVersionsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'diff_versions',
    'Compare two versions of a definition. Returns a section-level summary by default. Pass format="fields" for field-level structural diff with classification, or format="unified" for git-style line diff. Pass full=true for raw YAML content.',
    DiffVersionsInputSchema.shape,
    createToolHandler(DiffVersionsInputSchema, (n) =>
      registryClient.versions.diff(n.type, n.name, n.from, n.to, { full: n.full, format: n.format })
    , { toolName: 'diff_versions' })
  );
}
