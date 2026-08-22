/**
 * update_and_publish tool
 *
 * Composite workflow: update a definition and publish it in one step.
 * Inherits the smart version-up behavior from update_definition:
 * if the target version is published or doesn't exist and YAML is provided,
 * automatically creates a new draft version before publishing.
 */

import { getDefaultType } from '../utils/session-state.js';
import { z } from 'zod';
import type { RegistryClient, UpdateDefinitionBody } from '@uluops/registry-sdk';
import { isNotFoundError } from '@uluops/registry-sdk/errors';
import { isPublishedStatusError } from '../utils/error-guards.js';
import {
  DefinitionTypeWithDefaultSchema,
  VisibilitySchema,
  ChangeTypeSchema,
  type McpServerToolRegistration,
  createSuccessResponse,
  createErrorResponse,
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
  type: DefinitionTypeWithDefaultSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  yaml: z.string().max(500_000).optional(),
  file_path: z
    .string()
    .min(1)
    .max(1000)
    .describe('Path to a .yaml/.yml file on the MCP server host (read from the server\'s filesystem, not the caller\'s). Remote callers should pass yaml inline instead.')
    .optional(),
  visibility: VisibilitySchema.optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  change_type: ChangeTypeSchema.optional(),
});

/**
 * Patch the version field in definition YAML to match the requested version.
 * When update_and_publish falls back to create (because the target version is
 * published or doesn't exist), the YAML on disk may still contain the old
 * version. The API extracts version from YAML metadata, so we must ensure
 * the YAML version matches the requested version before calling create.
 */
function patchYamlVersion(yaml: string, newVersion: string): string {
  // Replace the first `version:` line value. Matches both root-level (e.g.
  // `version: 1.0.0` in an ADL document) and indented (e.g.
  // `  version: 1.0.0` nested under `interface:`) forms. `\s*` matches any
  // leading whitespace including none. Accepts unquoted or single/double
  // quoted version values, with optional prerelease (-rc.1, -beta.2) and
  // build metadata (+build.5) suffixes per semver 2.0.0.
  return yaml.replace(
    /^(\s*version:\s+)["']?\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?["']?/m,
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

        const { type: parsedType, name, version, yaml, visibility, description, tags, change_type } = input;
        // RG4: custom parse path — resolve the session default explicitly.
        const type = parsedType ?? getDefaultType();
        if (type === undefined) {
          return createErrorResponse(
            "Missing 'type': pass it explicitly (agent, command, workflow, pipeline) or set a session default first with set_default_type.",
          );
        }

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
            // Defensive guard against malformed SDK response — the SDK
            // types declare `created.version` as a non-nullable string, but
            // a runtime contract violation (network proxy mangling, SDK
            // regression) would silently pass `undefined` through to the
            // publish URL builder, producing /versions/undefined and a
            // confusing 404 for a draft that was just successfully created.
            // The `as unknown` cast intentionally bypasses the declared
            // type so the runtime check has somewhere to live.
            const runtimeVersion = (created as unknown as { version?: string }).version;
            if (runtimeVersion === undefined || runtimeVersion === '') {
              throw new Error(
                `Definitions create() returned no version field for ${type}/${name}. Cannot continue to publish step.`,
              );
            }
            publishVersion = runtimeVersion;
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
