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
export const DefinitionStatusSchema = z.enum(['draft', 'published', 'deprecated']);

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
export const SortFieldSchema = z.enum(['name', 'createdAt', 'updatedAt', 'executionCount']);

/** Sort direction. */
export const SortOrderSchema = z.enum(['asc', 'desc']);

/** AI model pricing/capability tiers. */
export const ModelTierSchema = z.enum(['budget', 'standard', 'premium', 'reasoning']);

/** AI model availability statuses. */
export const ModelStatusSchema = z.enum(['available', 'preview', 'deprecated']);

/** Semantic version change types for definition updates. */
export const ChangeTypeSchema = z.enum(['major', 'minor', 'patch']);
