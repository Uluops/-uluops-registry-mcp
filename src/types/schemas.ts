/**
 * Shared Zod schemas for MCP input validation
 *
 * These define the enum values accepted by registry tools.
 * MCP uses snake_case field names; normalizeKeys converts to camelCase for the SDK.
 */

import { z } from 'zod';

/** Registry definition types: agent, command, workflow, or pipeline. */
export const DefinitionTypeSchema = z.enum(['agent', 'command', 'workflow', 'pipeline']);

/** Lifecycle statuses for definitions. */
export const DefinitionStatusSchema = z.enum(['draft', 'published', 'deprecated', 'archived']);

/** Knowledge domain categories for definitions. */
export const DomainSchema = z.enum([
  'software',
  'security',
  'compliance',
  'legal',
  'medical',
  'financial',
  'scientific',
  'content',
  'general',
  'cognitive-lens',
]);

/** Agent behavioral subtypes. */
export const AgentTypeSchema = z.enum(['validator', 'executor', 'analyst', 'generator', 'explorer', 'forecaster']);

/** Access control levels for definitions. */
export const VisibilitySchema = z.enum(['private', 'unlisted', 'public']);

/** Sortable fields for list queries. */
export const SortFieldSchema = z.enum(['name', 'createdAt', 'updatedAt', 'executionCount', 'uniqueExecutionCount']);

/** Sort direction. */
export const SortOrderSchema = z.enum(['asc', 'desc']);

/** AI model pricing/capability tiers. */
export const ModelTierSchema = z.enum(['budget', 'standard', 'premium', 'reasoning']);

/** AI model availability statuses. */
export const ModelStatusSchema = z.enum(['available', 'preview', 'deprecated']);

/** Quality/provenance tiers for definitions. */
export const TierSchema = z.enum(['user', 'org', 'pro']);

/** Subscription tiers for content gating. */
export const SubscriptionTierSchema = z.enum(['free', 'hobbyist', 'plus', 'pro', 'enterprise']);

/** Semantic version change types for definition updates. */
export const ChangeTypeSchema = z.enum(['major', 'minor', 'patch']);

/** Authorship provenance classification. */
export const AuthorshipTypeSchema = z.enum(['human', 'agent', 'collaborative', 'automated']);

/** Contributor role in definition authorship. */
export const ContributorRoleSchema = z.enum(['author', 'optimizer', 'reviewer', 'editor', 'publisher']);

/** Actor type — human or agent. */
export const ActorTypeSchema = z.enum(['human', 'agent']);

/** A single contributor to a definition's authorship. */
export const ContributorSchema = z.object({
  id: z.string().min(1).max(100),
  role: ContributorRoleSchema,
  type: ActorTypeSchema,
  name: z.string().max(200).optional(),
  agent_name: z.string().max(200).optional(),
  contributed_at: z.string().optional(),
});

/** Full provenance record for a definition. */
export const ProvenanceInputSchema = z.object({
  authorship_type: AuthorshipTypeSchema,
  contributors: z.array(ContributorSchema).min(1).max(50),
  dialectic_rounds: z.number().int().nonnegative().optional(),
  optimization_run_id: z.string().max(100).optional(),
});
