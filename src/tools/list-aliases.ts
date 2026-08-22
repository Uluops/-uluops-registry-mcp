/**
 * list_aliases tool
 *
 * List model aliases.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ListAliasesInputSchema = z.object({});

export function registerListAliasesTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'list_aliases',
    'List all model aliases and their resolved provider+model mappings. ALIAS-FLOAT CONTRACT: bare aliases track the current family model and are repointed each generation (see resolve_alias); qualified model ids pin. There is deliberately no fable alias (restricted-availability model).',
    ListAliasesInputSchema.shape,
    createToolHandler(ListAliasesInputSchema, () => registryClient.models.listAliases())
  );
}
