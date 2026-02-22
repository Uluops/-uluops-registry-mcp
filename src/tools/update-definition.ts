/**
 * update_definition tool
 *
 * Update a draft definition version with new YAML, visibility, description, or tags.
 * Accepts either inline `yaml` or a `file_path` to read from disk.
 *
 * Smart version-up: If the target version is published or doesn't exist and YAML is
 * provided, automatically creates a new draft version via the create endpoint instead
 * of failing. The API server extracts the version from the YAML content.
 */

import { z } from 'zod';
import type { RegistryClient, UpdateDefinitionBody } from '@uluops/registry-sdk';
import { isNotFoundError, isValidationError } from '@uluops/registry-sdk/errors';
import {
  DefinitionTypeSchema,
  VisibilitySchema,
  ChangeTypeSchema,
  type McpServerToolRegistration,
} from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { resolveYamlInput } from '../utils/read-yaml-file.js';
import { trimDefinitionResponse } from '../utils/trim-definition.js';

export const UpdateDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  yaml: z.string().max(500_000).optional(),
  file_path: z.string().min(1).max(1000).optional(),
  visibility: VisibilitySchema.optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  change_type: ChangeTypeSchema.optional(),
});

/** Check if an error is a "published status" validation error from the API. */
function isPublishedStatusError(error: unknown): boolean {
  return isValidationError(error) &&
    error instanceof Error &&
    error.message.includes("'published' status");
}

export function registerUpdateDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'update_definition',
    'Update a draft definition version with new YAML, visibility, description, or tags.',
    UpdateDefinitionInputSchema.shape,
    createToolHandler(UpdateDefinitionInputSchema, async (n) => {
      const body: UpdateDefinitionBody = {};
      if (n.yaml !== undefined) body.yaml = n.yaml;
      if (n.visibility !== undefined) body.visibility = n.visibility;
      if (n.description !== undefined) body.description = n.description;
      if (n.tags !== undefined) body.tags = n.tags;
      if (n.changeType !== undefined) body.changeType = n.changeType;

      try {
        return await registryClient.definitions.update(n.type, n.name, n.version, body);
      } catch (error: unknown) {
        // Smart version-up: if version doesn't exist or is published, and YAML is
        // provided, auto-create a new draft version instead of failing.
        // SAFETY: n.yaml is guaranteed non-empty by the guard above. The Zod schema
        // validates yaml as optional string, so it's safe to pass to create().
        // This nested try/catch is intentional — the fallback path (create) can also
        // throw, and we want those errors to propagate to the outer handler.
        if (n.yaml !== undefined && n.yaml !== '' && (isNotFoundError(error) || isPublishedStatusError(error))) {
          const created = await registryClient.definitions.create(n.type, n.name, {
            yaml: n.yaml,
            ...(n.visibility !== undefined && { visibility: n.visibility }),
          });
          return {
            ...created,
            _note: isNotFoundError(error)
              ? `Version '${String(n.version)}' not found. Created new draft version '${created.version}'.`
              : `Version '${String(n.version)}' is published. Created new draft version '${created.version}'.`,
          };
        }
        throw error;
      }
    },
      {
        preProcess: (input) => resolveYamlInput(input, { required: false }),
        postProcess: trimDefinitionResponse,
      }
    )
  );
}
