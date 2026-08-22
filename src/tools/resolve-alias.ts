/**
 * resolve_alias tool
 *
 * Resolve a model alias (e.g. "sonnet") to provider+modelId.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ResolveAliasInputSchema = z.object({
  alias: z.string().min(1),
});

export function registerResolveAliasTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'resolve_alias',
    'Resolve a model alias (e.g. "sonnet", "haiku") to its provider and model ID. ALIAS-FLOAT CONTRACT: a bare alias means the CURRENT model in its family and is repointed each generation — every published definition using a bare alias adopts the new target on its next execution. Write a qualified model id (e.g. claude-sonnet-4-6) to pin.',
    ResolveAliasInputSchema.shape,
    createToolHandler(ResolveAliasInputSchema, (n) => registryClient.models.resolveAlias(n.alias))
  );
}
