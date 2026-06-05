/**
 * update_and_publish tool
 *
 * Composite workflow: update a definition and publish it in one step.
 * Inherits the smart version-up behavior from update_definition:
 * if the target version is published or doesn't exist and YAML is provided,
 * automatically creates a new draft version before publishing.
 */

import { z } from 'zod';
import type { RegistryClient, UpdateDefinitionBody } from '@uluops/registry-sdk';
import { isNotFoundError, isValidationError } from '@uluops/registry-sdk/errors';
import {
  DefinitionTypeSchema,
  VisibilitySchema,
  ChangeTypeSchema,
  type McpServerToolRegistration,
  createSuccessResponse,
} from '../types/index.js';
import type { McpToolResponse } from '../types/index.js';
import { mapSdkErrorToMcp, mapZodErrorToMcp } from '../client/sdk-error-mapper.js';
import { resolveYamlInput } from '../utils/read-yaml-file.js';
import { trimDefinitionResponse } from '../utils/trim-definition.js';
import { injectSessionType } from '../utils/tool-handler.js';

/** Type guard: checks if resolveYamlInput returned an error response. */
function isMcpResponse(value: unknown): value is McpToolResponse {
  return typeof value === 'object' && value !== null && 'content' in value && Array.isArray((value as McpToolResponse).content);
}

export const UpdateAndPublishInputSchema = z.object({
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

/**
 * Patch the version field in definition YAML to match the requested version.
 * When update_and_publish falls back to create (because the target version is
 * published or doesn't exist), the YAML on disk may still contain the old
 * version. The API extracts version from YAML metadata, so we must ensure
 * the YAML version matches the requested version before calling create.
 */
function patchYamlVersion(yaml: string, newVersion: string): string {
  // Replace the first indented `version:` field value (the interface version)
  return yaml.replace(
    /^(\s+version:\s+)["']?\d+\.\d+\.\d+["']?/m,
    `$1"${newVersion}"`
  );
}

export function registerUpdateAndPublishTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'update_and_publish',
    'Update a definition and publish it in one step. Accepts yaml or file_path. Auto-creates a new draft if the version is published or missing.',
    UpdateAndPublishInputSchema.shape,
    async (args: unknown) => {
      try {
        // Inject session-level default type
        const injected = injectSessionType(args);

        // Resolve file_path → yaml BEFORE Zod validation
        const resolved = resolveYamlInput(injected as Record<string, unknown>, { required: false });
        if (isMcpResponse(resolved)) return resolved;

        const input = UpdateAndPublishInputSchema.parse(resolved);

        const { type, name, version, yaml, visibility, description, tags, change_type } = input;

        // Build update body (SDK expects camelCase changeType)
        const body: UpdateDefinitionBody = {};
        if (yaml !== undefined) body.yaml = yaml;
        if (visibility !== undefined) body.visibility = visibility;
        if (description !== undefined) body.description = description;
        if (tags !== undefined) body.tags = tags;
        if (change_type !== undefined) body.changeType = change_type;

        // Step 1: Update (with smart create fallback)
        let publishVersion = version;
        let note = 'Updated and published in one step';
        try {
          await registryClient.definitions.update(type, name, version, body);
        } catch (error: unknown) {
          if (yaml !== undefined && yaml !== '' && (isNotFoundError(error) || isPublishedStatusError(error))) {
            // Patch YAML version to match requested version — the file on disk
            // may still contain the old (published) version string.
            const patchedYaml = patchYamlVersion(yaml, version);
            const created = await registryClient.definitions.create(type, name, {
              yaml: patchedYaml,
              ...(visibility !== undefined && { visibility }),
            });
            publishVersion = created.version;
            note = isNotFoundError(error)
              ? `Version '${version}' not found. Created new draft '${created.version}' and published.`
              : `Version '${version}' is published. Created new draft '${created.version}' and published.`;
          } else {
            throw error;
          }
        }

        // Step 2: Publish
        const { definition: published, warnings } = await registryClient.definitions.publish(type, name, publishVersion);

        const trimmed = trimDefinitionResponse(published) as Record<string, unknown>;
        // Surface non-fatal publish warnings (TRANSLATION_FAILED etc.) alongside the
        // trimmed definition. Empty array is fine — distinguishes "no warnings" from
        // "this tool predates the warnings contract".
        return createSuccessResponse({ ...trimmed, _note: note, warnings });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return mapZodErrorToMcp(error);
        }
        return mapSdkErrorToMcp(error);
      }
    }
  );
}
