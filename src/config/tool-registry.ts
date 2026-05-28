/**
 * Tool Registry Configuration
 *
 * Per-tool security policies for the MCP server.
 * Required by mcp-secure-server's semantic validation layer.
 */

import type { ToolSpec } from 'mcp-secure-server';

const KB = 1024;
const MB = 1024 * KB;

export const toolRegistry: ToolSpec[] = [
  // ============================================================================
  // Session Management
  // ============================================================================
  {
    name: 'set_default_type',
    sideEffects: 'read',
    maxArgsSize: 256,
    maxEgressBytes: 256,
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
    maxEgressBytes: 10 * KB,
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'validate_definition',
    sideEffects: 'read',
    maxArgsSize: 500 * KB,
    maxEgressBytes: 100 * KB,
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
    maxArgsSize: 1 * MB,
    maxEgressBytes: 1 * MB,
    quotaPerMinute: 60,
    quotaPerHour: 1000,
  },
  {
    name: 'update_definition',
    sideEffects: 'write',
    maxArgsSize: 1 * MB,
    maxEgressBytes: 1 * MB,
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
    maxEgressBytes: 200 * KB,
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
    maxEgressBytes: 10 * KB,
    quotaPerMinute: 10,
    quotaPerHour: 100,
  },
  {
    name: 'update_and_publish',
    sideEffects: 'write',
    maxArgsSize: 1 * MB,
    maxEgressBytes: 1 * MB,
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
    maxEgressBytes: 100 * KB,
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
    maxEgressBytes: 200 * KB,
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
  {
    name: 'is_forkable',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 10 * KB,
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },
  {
    name: 'get_fork_lineage',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 100 * KB,
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },
  {
    name: 'record_execution',
    sideEffects: 'write',
    maxArgsSize: 50 * KB,
    maxEgressBytes: 10 * KB,
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
    maxArgsSize: 500 * KB,
    maxEgressBytes: 200 * KB,
    quotaPerMinute: 30,
    quotaPerHour: 500,
  },
  {
    name: 'get_model',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 50 * KB,
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'list_providers',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 100 * KB,
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'list_aliases',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 100 * KB,
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'get_translator_version',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 10 * KB,
    quotaPerMinute: 240,
    quotaPerHour: 5000,
  },
  {
    name: 'sync_models',
    sideEffects: 'write',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 200 * KB,
    quotaPerMinute: 10,
    quotaPerHour: 50,
  },
  {
    name: 'get_user',
    sideEffects: 'read',
    maxArgsSize: 10 * KB,
    maxEgressBytes: 50 * KB,
    quotaPerMinute: 120,
    quotaPerHour: 2000,
  },
  {
    name: 'batch_users',
    sideEffects: 'read',
    maxArgsSize: 20 * KB,
    maxEgressBytes: 200 * KB,
    quotaPerMinute: 60,
    quotaPerHour: 1000,
  },

  {
    name: 'list_languages',
    sideEffects: 'read',
    maxArgsSize: 256,
    maxEgressBytes: 10 * KB,
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
    maxArgsSize: 256,
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
