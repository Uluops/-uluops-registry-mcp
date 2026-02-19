/**
 * get_definition tool
 *
 * Get a single definition by type+name, optionally with YAML/runtime/refs.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetDefinitionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().optional(),
  include_yaml: z.boolean().optional(),
  include_runtime: z.boolean().optional(),
  include_refs: z.boolean().optional(),
});

export function registerGetDefinitionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_definition',
    'Get a single definition by type and name. Optionally include YAML content, runtime markdown, or cross-references.',
    GetDefinitionInputSchema.shape,
    createToolHandler(GetDefinitionInputSchema, (n) => {
      const options: Record<string, unknown> = {};
      if (n.includeYaml !== undefined) options.includeYaml = n.includeYaml;
      if (n.includeRuntime !== undefined) options.includeRuntime = n.includeRuntime;
      if (n.includeRefs !== undefined) options.includeRefs = n.includeRefs;
      return registryClient.definitions.get(n.type, n.name, n.version, options);
    })
  );
}
