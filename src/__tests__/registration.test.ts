import { describe, it, expect, vi } from 'vitest';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration, McpServerResourceRegistration } from '../types/index.js';
import { registerAllTools } from '../tools/index.js';
import { registerAllResources } from '../resources/index.js';
import { toolRegistry } from '../config/tool-registry.js';

// Mock the registry SDK error module (needed by tool handlers)
vi.mock('@uluops/registry-sdk/errors', () => ({
  isRegistryApiError: (): boolean => false,
  isNotFoundError: (): boolean => false,
  isRateLimitError: (): boolean => false,
  isValidationError: (): boolean => false,
  isConflictError: (): boolean => false,
  isUnprocessableError: (): boolean => false,
  UnauthorizedError: class extends Error {},
  ForbiddenError: class extends Error {},
}));

function createMockToolServer(): McpServerToolRegistration & { tools: string[] } {
  const tools: string[] = [];
  return {
    tools,
    tool(name: string): void {
      tools.push(name);
    },
  } as unknown as McpServerToolRegistration & { tools: string[] };
}

function createMockResourceServer(): McpServerResourceRegistration & { resources: string[] } {
  const resources: string[] = [];
  return {
    resources,
    resource(name: string): void {
      resources.push(name);
    },
  } as unknown as McpServerResourceRegistration & { resources: string[] };
}

function createMinimalClient(): RegistryClient {
  const handler = { get: vi.fn(), apply: vi.fn() };
  return new Proxy({} as RegistryClient, handler);
}

describe('registerAllTools', () => {
  it('registers exactly 31 tools', () => {
    const server = createMockToolServer();
    registerAllTools(server, createMinimalClient());
    expect(server.tools).toHaveLength(32);
  });

  it('registers all expected tool names', () => {
    const server = createMockToolServer();
    registerAllTools(server, createMinimalClient());
    const expectedTools = [
      'set_default_type',
      'list_definitions',
      'get_definition',
      'search_definitions',
      'list_models',
      'resolve_alias',
      'validate_definition',
      'render_definition',
      'create_definition',
      'update_definition',
      'publish_definition',
      'deprecate_definition',
      'delete_definition',
      'list_versions',
      'diff_versions',
      'get_dependencies',
      'get_dependents',
      'get_execution_stats',
      'list_forks',
      'fork_definition',
      'check_forkable',
      'get_fork_lineage',
      'record_execution',
      'retranslate_definition',
      'upgrade_definition',
      'get_model',
      'list_providers',
      'list_aliases',
      'get_translator_version',
      'sync_models',
      'get_user',
      'batch_users',
    ];
    for (const name of expectedTools) {
      expect(server.tools).toContain(name);
    }
  });

  it('registers no duplicate tool names', () => {
    const server = createMockToolServer();
    registerAllTools(server, createMinimalClient());
    const unique = new Set(server.tools);
    expect(unique.size).toBe(server.tools.length);
  });
});

describe('registerAllResources', () => {
  it('registers exactly 4 resources', () => {
    const server = createMockResourceServer();
    registerAllResources(server, createMinimalClient());
    expect(server.resources).toHaveLength(4);
  });

  it('registers all expected resource names', () => {
    const server = createMockResourceServer();
    registerAllResources(server, createMinimalClient());
    expect(server.resources).toContain('definitions');
    expect(server.resources).toContain('models');
    expect(server.resources).toContain('definition-types');
    expect(server.resources).toContain('providers');
  });
});

describe('toolRegistry configuration', () => {
  it('has exactly 31 tool specs', () => {
    expect(toolRegistry).toHaveLength(32);
  });

  it('every registered tool has a matching toolRegistry entry', () => {
    const server = createMockToolServer();
    registerAllTools(server, createMinimalClient());
    const registryNames = new Set(toolRegistry.map((t) => t.name));
    for (const toolName of server.tools) {
      expect(registryNames.has(toolName)).toBe(true);
    }
  });

  it('every toolRegistry entry corresponds to a registered tool', () => {
    const server = createMockToolServer();
    registerAllTools(server, createMinimalClient());
    const toolNames = new Set(server.tools);
    for (const spec of toolRegistry) {
      expect(toolNames.has(spec.name)).toBe(true);
    }
  });

  it('all specs have valid sideEffects values', () => {
    for (const spec of toolRegistry) {
      expect(['read', 'write']).toContain(spec.sideEffects);
    }
  });

  it('all specs have positive quota values', () => {
    for (const spec of toolRegistry) {
      expect(spec.quotaPerMinute).toBeGreaterThan(0);
      expect(spec.quotaPerHour).toBeGreaterThan(0);
      expect(spec.maxArgsSize).toBeGreaterThan(0);
      expect(spec.maxEgressBytes).toBeGreaterThan(0);
    }
  });

  it('hourly quota is always greater than per-minute quota', () => {
    for (const spec of toolRegistry) {
      expect(spec.quotaPerHour).toBeGreaterThan(spec.quotaPerMinute);
    }
  });

  it('write tools have lower quotas than read tools', () => {
    const readQuotas = toolRegistry
      .filter((t) => t.sideEffects === 'read')
      .map((t) => t.quotaPerMinute ?? 0);
    const writeQuotas = toolRegistry
      .filter((t) => t.sideEffects === 'write')
      .map((t) => t.quotaPerMinute ?? 0);

    const avgRead = readQuotas.reduce((a: number, b: number) => a + b, 0) / readQuotas.length;
    const avgWrite = writeQuotas.reduce((a: number, b: number) => a + b, 0) / writeQuotas.length;
    expect(avgRead).toBeGreaterThan(avgWrite);
  });
});
