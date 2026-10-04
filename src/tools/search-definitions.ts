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
  SortFieldSchema,
  SortOrderSchema,
  type McpServerToolRegistration,
} from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const SearchDefinitionsInputSchema = z.object({
  query: z.string().min(1),
  match: z.enum(['exact', 'prefix', 'text']).optional()
    .describe('Omit for legacy keyword search. exact/prefix match a literal identifier, trimmed and lowercased.'),
  page: z.number().int().positive().optional(),
  sort: SortFieldSchema.optional(),
  order: SortOrderSchema.optional(),
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
    'Search definitions by keyword (default), exact identifier, or literal identifier prefix. Keyword searches sanitized terms of at least 3 characters across name, display_name, description using FULLTEXT; short original searches use name/display_name, and longer searches sanitized below 3 characters also use description. Tags filter independently by OR-any and are not keyword searched. Supports page, limit, sort and order.',
    SearchDefinitionsInputSchema.shape,
    createToolHandler(SearchDefinitionsInputSchema.superRefine((value, ctx) => {
      if ((value.match === 'exact' || value.match === 'prefix') && (!/^[\x20-\x7e]+$/.test(value.query) || value.query.length > 100 || value.query.trim().length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Identifier must contain 1-100 printable ASCII characters before trimming and be nonblank', path: ['query'] });
      }
      if (value.match === 'text' && (!/^[\x20-\x7e]+$/.test(value.query) || value.query.length > 100 || value.query.trim().length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Text search requires a nonblank query of 1-100 printable ASCII characters before trimming', path: ['query'] });
      }
    }), (n) =>
      registryClient.definitions.list({
        ...(n.match === 'exact' || n.match === 'prefix' ? { name: (n.query as string).trim().toLowerCase() } : { search: n.query }),
        ...(n.match !== undefined ? { match: n.match } : {}),
        ...(n.page !== undefined ? { offset: (n.page - 1) * n.limit } : {}),
        ...(n.sort !== undefined ? { sortBy: n.sort } : {}),
        ...(n.order !== undefined ? { sortOrder: n.order } : {}),
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
    , { toolName: 'search_definitions' })
  );
}
