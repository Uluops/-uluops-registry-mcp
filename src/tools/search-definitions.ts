/**
 * search_definitions tool
 *
 * Convenience alias — search definitions by keyword.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import {
  DefinitionTypeSchema,
  DefinitionStatusSchema,
  DomainSchema,
  AgentTypeSchema,
  VisibilitySchema,
  AuthorshipTypeSchema,
  type McpServerToolRegistration,
} from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const SearchDefinitionsInputSchema = z.object({
  query: z.string().min(1),
  type: DefinitionTypeSchema.optional(),
  status: DefinitionStatusSchema.optional(),
  domain: DomainSchema.optional(),
  agent_type: AgentTypeSchema.optional(),
  visibility: VisibilitySchema.optional(),
  tags: z.array(z.string()).optional(),
  is_fork: z.boolean().optional().describe('Filter by fork status: true = only forks, false = only originals'),
  authorship_type: AuthorshipTypeSchema.optional().describe('Filter by authorship type: human, agent, collaborative, or automated'),
  limit: z.number().int().positive().max(100).default(20),
});

export function registerSearchDefinitionsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'search_definitions',
    'Search definitions by keyword with optional type, status, domain, agent_type, visibility, and tags filters.',
    SearchDefinitionsInputSchema.shape,
    createToolHandler(SearchDefinitionsInputSchema, (n) =>
      registryClient.definitions.list({
        search: n.query,
        type: n.type,
        status: n.status,
        domain: n.domain,
        agentType: n.agentType,
        visibility: n.visibility,
        tag: n.tags,
        isFork: n.isFork,
        authorshipType: n.authorshipType,
        limit: n.limit,
      })
    )
  );
}
