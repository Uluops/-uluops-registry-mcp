/**
 * list_definitions tool
 *
 * List definitions with filters (type, status, domain, visibility, search, tags, pagination).
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import {
  DefinitionTypeSchema,
  DefinitionStatusSchema,
  DomainSchema,
  AgentTypeSchema,
  VisibilitySchema,
  SortFieldSchema,
  SortOrderSchema,
  type McpServerToolRegistration,
} from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ListDefinitionsInputSchema = z.object({
  type: DefinitionTypeSchema.optional(),
  status: DefinitionStatusSchema.optional(),
  domain: DomainSchema.optional(),
  agent_type: AgentTypeSchema.optional(),
  visibility: VisibilitySchema.optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sort: SortFieldSchema.optional(),
  order: SortOrderSchema.optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export function registerListDefinitionsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'list_definitions',
    'List registry definitions with optional filters (type, status, domain, visibility, search, tags, pagination).',
    ListDefinitionsInputSchema.shape,
    createToolHandler(ListDefinitionsInputSchema, (n) =>
      registryClient.definitions.list(n)
    )
  );
}
