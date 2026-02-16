/**
 * Shared Zod schemas for MCP input validation
 *
 * These define the enum values accepted by registry tools.
 * MCP uses snake_case field names; normalizeKeys converts to camelCase for the SDK.
 */

import { z } from 'zod';

// Definition types
export const DefinitionTypeSchema = z.enum(['agent', 'command', 'workflow', 'pipeline']);

// Definition statuses
export const DefinitionStatusSchema = z.enum(['draft', 'published', 'deprecated']);

// Domain categories
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
]);

// Agent subtypes
export const AgentTypeSchema = z.enum(['validator', 'executor', 'analyst', 'generator']);

// Visibility levels
export const VisibilitySchema = z.enum(['private', 'unlisted', 'public']);

// Sort fields
export const SortFieldSchema = z.enum(['name', 'createdAt', 'updatedAt', 'executionCount']);

// Sort orders
export const SortOrderSchema = z.enum(['asc', 'desc']);

// Model tiers
export const ModelTierSchema = z.enum(['budget', 'standard', 'premium', 'reasoning']);

// Model statuses
export const ModelStatusSchema = z.enum(['available', 'preview', 'deprecated']);

// Version change types
export const ChangeTypeSchema = z.enum(['major', 'minor', 'patch']);
