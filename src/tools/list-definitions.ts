/**
 * list_definitions tool
 *
 * List definitions with filters (type, status, domain, visibility, search, tags, pagination).
 * Returns a compact per-item projection by default; pass format:'full' for all
 * catalog fields. The public catalog is large enough (558+ definitions) that an
 * unprojected default page exceeds MCP client response limits (RE-PROBE-02 N4)
 * — the 2-space pretty-printed full shape is ~26 fields/item × 50 items.
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
  AuthorshipTypeSchema,
  type McpServerToolRegistration,
} from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

/** Per-item projection served by format:'compact' (the default). */
export const COMPACT_LIST_FIELDS = [
  'type',
  'name',
  // Which org the row belongs to (`@org/name`). Since 0.11.0 lists are not
  // narrowed by ULUOPS_ORG_SLUG, so two orgs' rows of one name can appear
  // together; without this they are indistinguishable (review run #219).
  'namespace',
  'version',
  'status',
  'visibility',
  'description',
  'relevance',
] as const;

export const ListDefinitionsInputSchema = z.object({
  type: DefinitionTypeSchema.optional(),
  status: DefinitionStatusSchema.optional(),
  domain: DomainSchema.optional(),
  agent_type: AgentTypeSchema.optional(),
  visibility: VisibilitySchema.optional(),
  search: z.string().optional(),
  name: z.string().min(1).max(100).regex(/^[\x20-\x7e]+$/).transform((value) => value.trim().toLowerCase()).refine((value) => value.length > 0, 'Identifier must be nonblank').optional()
    .describe('Literal identifier, trimmed and lowercased. Defaults to exact matching; punctuation is preserved.'),
  match: z.enum(['exact', 'prefix', 'text']).optional(),
  tags: z.array(z.string()).optional(),
  is_fork: z.boolean().optional().describe('Filter by fork status: true = only forks, false = only originals'),
  authorship_type: AuthorshipTypeSchema.optional().describe('Filter by authorship type: human, agent, collaborative, or automated'),
  sort: SortFieldSchema.optional(),
  order: SortOrderSchema.optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  format: z
    .enum(['compact', 'full'])
    .optional()
    .default('compact')
    .describe(
      "Response verbosity. 'compact' (default) projects each item to " +
        `${COMPACT_LIST_FIELDS.join(', ')} — enough to browse and address a ` +
        "definition. 'full' returns all catalog fields per item (counts, risk, " +
        'timestamps, authorship). To select other specific fields, combine ' +
        "format:'full' with the fields parameter.",
    ),
});

/** Project one catalog item down to the compact field set. */
function toCompactItem(item: unknown): unknown {
  if (typeof item !== 'object' || item === null) return item;
  const obj = item as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const field of COMPACT_LIST_FIELDS) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
}

export function registerListDefinitionsTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'list_definitions',
    'List registry definitions with optional filters (type, status, domain, visibility, search, ' +
      'name, match, tags, pagination). name implies exact identifier matching; match=prefix matches a literal prefix. ' +
      'Keyword text uses FULLTEXT over name, display_name, description for sanitized terms of at least 3 characters; ' +
      'short original searches use name/display_name, and longer searches sanitized below 3 characters also use description. ' +
      'Tags filter independently by OR-any and are not keyword searched. ' +
      "Returns a compact projection per item by default; pass format:'full' " +
      'for all catalog fields.',
    ListDefinitionsInputSchema.shape,
    createToolHandler(ListDefinitionsInputSchema.superRefine((value, ctx) => {
      const error = value.name !== undefined
        ? (value.search !== undefined || value.match === 'text')
        : (value.match === 'exact' || value.match === 'prefix' || (value.match === 'text' && (value.search === undefined || !/^[\x20-\x7e]+$/.test(value.search) || value.search.length > 100 || value.search.trim().length === 0)));
      if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'exact/prefix require name without search; text requires nonblank printable ASCII search of at most 100 characters without name' });
    }), async (n) => {
      const query: Record<string, unknown> = {};
      if (n.type !== undefined) query.type = n.type;
      if (n.status !== undefined) query.status = n.status;
      if (n.domain !== undefined) query.domain = n.domain;
      if (n.agentType !== undefined) query.agentType = n.agentType;
      if (n.visibility !== undefined) query.visibility = n.visibility;
      if (n.search !== undefined) query.search = n.search;
      if (n.name !== undefined) query.name = n.name;
      if (n.match !== undefined) query.match = n.match;
      if (n.tags !== undefined) query.tag = n.tags;
      if (n.isFork !== undefined) query.isFork = n.isFork;
      if (n.authorshipType !== undefined) query.authorshipType = n.authorshipType;
      if (n.sort !== undefined) query.sortBy = n.sort;
      if (n.order !== undefined) query.sortOrder = n.order;
      // 50 mirrors the API's default page size — offsets must be computed with
      // the same value the server will apply when no limit is sent.
      if (n.page !== undefined) {
        query.offset = (n.page - 1) * (n.limit ?? 50);
        query.limit = n.limit ?? 50;
      }
      if (n.limit !== undefined) query.limit = n.limit;
      const result = await registryClient.definitions.list(query);
      if (n.format === 'full') {
        return result;
      }
      return {
        ...result,
        format: 'compact',
        definitions: result.definitions.map(toCompactItem),
      };
    }, { toolName: 'list_definitions' })
  );
}
