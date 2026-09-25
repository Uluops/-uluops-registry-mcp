/**
 * Tool Registry Configuration
 *
 * Per-tool security policies for the MCP server.
 * Required by mcp-secure-server's semantic validation layer.
 */

import type { ToolSpec } from 'mcp-secure-server';
import { ENVELOPE_BYTES } from './limits.js';

const KB = 1024;
const MB = 1024 * KB;

// SIZE CAPS — re-derived 2026-09-24 for mcp-secure-server 0.0.25 (tracker 14baaacc follow-up).
// Layer 4 evaluates maxEgressBytes at REQUEST time as argsBytes * 16, so any maxEgressBytes
// below 16 * maxArgsSize silently made egress/16 the real argument cap (set_default_type
// "workflow" was refused; validate_definition topped out near 6.4 KB). Every egress is now
// >= 16 * maxArgsSize. Since 0.0.23 maxArgsSize itself is enforced on every tool (UTF-8 bytes
// of the JSON arguments): the five yaml-bearing tools get exactly ENVELOPE_BYTES (config/limits.ts) —
// the shared 500 KB request envelope, so the tool gate never binds before it and never sits
// dead above it; every tool gets at least 1 KB for the universal `fields` parameter. tool-registry-caps.test.ts derives both
// rules from the Zod shapes and fails on any regression.

export const toolRegistry: ToolSpec[] = [
  // ============================================================================
  // Session Management
  // ============================================================================
  {
    name: 'set_default_type',
    sideEffects: 'read',
    maxArgsSize: 1 * KB,
    maxEgressBytes: 16 * (1 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 30,
    quotaPerHour: 200,
  },

  // ============================================================================
  // P0 Core Tools
  // ============================================================================
  {
    name: 'list_definitions',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 1 * MB,
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'get_definition',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 500 * KB,
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'search_definitions',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 1 * MB,
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'list_models',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 500 * KB,
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'resolve_alias',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 16 * (10 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'validate_definition',
    sideEffects: 'read',
    maxArgsSize: ENVELOPE_BYTES,
    maxEgressBytes: 16 * ENVELOPE_BYTES, // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 60,
    quotaPerHour: 1000,
  },
  {
    name: 'render_definition',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 500 * KB,
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },

  // ============================================================================
  // P1 Extended Tools
  // ============================================================================
  {
    name: 'create_definition',
    sideEffects: 'write',
    maxArgsSize: ENVELOPE_BYTES,
    maxEgressBytes: 16 * ENVELOPE_BYTES, // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 60,
    quotaPerHour: 1000,
  },
  {
    name: 'update_definition',
    sideEffects: 'write',
    maxArgsSize: ENVELOPE_BYTES,
    maxEgressBytes: 16 * ENVELOPE_BYTES, // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 60,
    quotaPerHour: 1000,
  },
  {
    name: 'publish_definition',
    sideEffects: 'write',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 200 * KB,
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
  {
    name: 'deprecate_definition',
    sideEffects: 'write',
    maxArgsSize: 20 * KB,
    maxEgressBytes: 16 * (20 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
  {
    name: 'archive_definition',
    sideEffects: 'write',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 200 * KB,
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
  {
    name: 'delete_definition',
    sideEffects: 'write',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 16 * (10 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 10,
    quotaPerHour: 100,
  },
  {
    name: 'update_and_publish',
    sideEffects: 'write',
    maxArgsSize: ENVELOPE_BYTES,
    maxEgressBytes: 16 * ENVELOPE_BYTES, // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
  {
    name: 'batch_publish',
    sideEffects: 'write',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 500 * KB,
    quotaPerMinute: 10,
    quotaPerHour: 200,
  },
  {
    name: 'list_versions',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 500 * KB,
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'diff_versions',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 500 * KB,
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },
  {
    name: 'get_dependencies',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 200 * KB,
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },
  {
    name: 'get_dependents',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 200 * KB,
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },
  {
    name: 'get_execution_stats',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 16 * (10 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },
  {
    name: 'list_forks',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 200 * KB,
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },

  // ============================================================================
  // P2 Admin/Specialized Tools
  // ============================================================================
  {
    name: 'fork_definition',
    sideEffects: 'write',
    maxArgsSize: 20 * KB,
    maxEgressBytes: 16 * (20 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
  {
    name: 'is_forkable',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 16 * (10 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },
  {
    name: 'get_fork_lineage',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 16 * (10 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },
  {
    name: 'record_execution',
    sideEffects: 'write',
    maxArgsSize: 50 * KB,
    maxEgressBytes: 16 * (50 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },
  {
    name: 'retranslate_definition',
    sideEffects: 'write',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 200 * KB,
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
  {
    name: 'upgrade_definition',
    sideEffects: 'write',
    maxArgsSize: ENVELOPE_BYTES,
    maxEgressBytes: 16 * ENVELOPE_BYTES, // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
  {
    name: 'get_model',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 16 * (10 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'list_providers',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 16 * (10 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'list_aliases',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 16 * (10 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'get_translator_version',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 16 * (10 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'get_user',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 16 * (10 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },
  {
    name: 'batch_users',
    sideEffects: 'read',
    maxArgsSize: 20 * KB,
    maxEgressBytes: 16 * (20 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 60,
    quotaPerHour: 1000,
  },

  {
    name: 'list_languages',
    sideEffects: 'read',
    maxArgsSize: 1 * KB,
    maxEgressBytes: 16 * (1 * KB), // = 16 x maxArgsSize — Layer 4 checks argsBytes*16 at request time
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'get_language',
    sideEffects: 'read',
    maxArgsSize: 1 * KB,
    maxEgressBytes: 500 * KB,
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },

  // ============================================================================
  // P3 Analytics
  // ============================================================================
  {
    name: 'get_effectiveness',
    sideEffects: 'read',
    maxArgsSize: 1 * KB,
    maxEgressBytes: 50 * KB,
    quotaPerMinute: 60,
    quotaPerHour: 1000,
  },
  {
    name: 'get_health',
    sideEffects: 'read',
    maxArgsSize: 1 * KB,
    maxEgressBytes: 50 * KB,
    quotaPerMinute: 60,
    quotaPerHour: 1000,
  },
  {
    name: 'get_ecosystem_overview',
    sideEffects: 'read',
    maxArgsSize: 1 * KB,
    maxEgressBytes: 100 * KB,
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
  {
    name: 'get_lineage',
    sideEffects: 'read',
    maxArgsSize: 1 * KB,
    maxEgressBytes: 100 * KB,
    quotaPerMinute: 60,
    quotaPerHour: 1000,
  },
  {
    name: 'get_evolution',
    sideEffects: 'read',
    maxArgsSize: 1 * KB,
    maxEgressBytes: 50 * KB,
    quotaPerMinute: 60,
    quotaPerHour: 1000,
  },
  {
    name: 'get_translation_analytics',
    sideEffects: 'read',
    maxArgsSize: 1 * KB,
    maxEgressBytes: 50 * KB,
    quotaPerMinute: 60,
    quotaPerHour: 1000,
  },
  {
    name: 'compare_effectiveness',
    sideEffects: 'read',
    maxArgsSize: 2 * KB,
    maxEgressBytes: 50 * KB,
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
  {
    name: 'get_diff_impact',
    sideEffects: 'read',
    maxArgsSize: 1 * KB,
    maxEgressBytes: 50 * KB,
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
];
