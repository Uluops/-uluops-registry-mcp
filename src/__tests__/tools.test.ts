import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';
import { registerListDefinitionsTool } from '../tools/list-definitions.js';
import { registerGetDefinitionTool } from '../tools/get-definition.js';
import { registerDeleteDefinitionTool } from '../tools/delete-definition.js';
import { registerSearchDefinitionsTool } from '../tools/search-definitions.js';
import { registerCreateDefinitionTool } from '../tools/create-definition.js';

// Mock the registry SDK error module
vi.mock('@uluops/registry-sdk/errors', () => ({
  isRegistryApiError: () => false,
  isNotFoundError: () => false,
  isRateLimitError: () => false,
  isValidationError: () => false,
  isConflictError: () => false,
  isUnprocessableError: () => false,
  UnauthorizedError: class extends Error {},
  ForbiddenError: class extends Error {},
}));

type ToolEntry = {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: unknown) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
};

function createMockServer(): McpServerToolRegistration & { tools: ToolEntry[] } {
  const tools: ToolEntry[] = [];
  return {
    tools,
    tool(name: string, description: string, schema: unknown, handler: ToolEntry['handler']) {
      tools.push({ name, description, schema, handler });
    },
  };
}

function createMockRegistryClient(overrides?: Record<string, unknown>): RegistryClient {
  return {
    definitions: {
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      get: vi.fn().mockResolvedValue({ name: 'test', type: 'agent' }),
      search: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      create: vi.fn().mockResolvedValue({ name: 'new-def', type: 'agent' }),
      delete: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    },
  } as unknown as RegistryClient;
}

describe('Tool Registration', () => {
  let server: ReturnType<typeof createMockServer>;
  let client: RegistryClient;

  beforeEach(() => {
    server = createMockServer();
    client = createMockRegistryClient();
  });

  describe('list_definitions', () => {
    it('registers the tool with correct name', () => {
      registerListDefinitionsTool(server, client);
      expect(server.tools).toHaveLength(1);
      expect(server.tools[0].name).toBe('list_definitions');
    });

    it('calls registryClient.definitions.list with normalized args', async () => {
      registerListDefinitionsTool(server, client);
      const handler = server.tools[0].handler;

      await handler({ type: 'agent', status: 'published' });
      expect(client.definitions.list).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'agent', status: 'published' })
      );
    });

    it('returns list result as JSON', async () => {
      const mockData = { items: [{ name: 'test' }], total: 1 };
      client = createMockRegistryClient({ list: vi.fn().mockResolvedValue(mockData) });
      server = createMockServer();
      registerListDefinitionsTool(server, client);

      const result = await server.tools[0].handler({});
      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(mockData);
    });

    it('rejects invalid enum values', async () => {
      registerListDefinitionsTool(server, client);
      const result = await server.tools[0].handler({ type: 'invalid_type' });
      expect(result.isError).toBe(true);
    });
  });

  describe('get_definition', () => {
    it('registers the tool with correct name', () => {
      registerGetDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('get_definition');
    });

    it('passes type and name as positional args', async () => {
      registerGetDefinitionTool(server, client);
      await server.tools[0].handler({ type: 'agent', name: 'code-validator' });
      expect(client.definitions.get).toHaveBeenCalledWith(
        'agent',
        'code-validator',
        undefined,
        expect.any(Object)
      );
    });

    it('passes include options correctly', async () => {
      registerGetDefinitionTool(server, client);
      await server.tools[0].handler({
        type: 'agent',
        name: 'test',
        include_yaml: true,
        include_runtime: false,
      });
      expect(client.definitions.get).toHaveBeenCalledWith(
        'agent',
        'test',
        undefined,
        expect.objectContaining({ includeYaml: true, includeRuntime: false })
      );
    });

    it('rejects missing required name', async () => {
      registerGetDefinitionTool(server, client);
      const result = await server.tools[0].handler({ type: 'agent' });
      expect(result.isError).toBe(true);
    });
  });

  describe('delete_definition', () => {
    it('registers the tool with correct name', () => {
      registerDeleteDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('delete_definition');
    });

    it('passes type, name, version as positional args', async () => {
      registerDeleteDefinitionTool(server, client);
      await server.tools[0].handler({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(client.definitions.delete).toHaveBeenCalledWith('agent', 'test', '1.0.0');
    });

    it('returns success: true for void response', async () => {
      registerDeleteDefinitionTool(server, client);
      const result = await server.tools[0].handler({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
    });

    it('rejects missing version', async () => {
      registerDeleteDefinitionTool(server, client);
      const result = await server.tools[0].handler({ type: 'agent', name: 'test' });
      expect(result.isError).toBe(true);
    });
  });

  describe('search_definitions', () => {
    it('registers the tool with correct name', () => {
      registerSearchDefinitionsTool(server, client);
      expect(server.tools[0].name).toBe('search_definitions');
    });

    it('passes search query to definitions.list with search param', async () => {
      registerSearchDefinitionsTool(server, client);
      await server.tools[0].handler({ query: 'code-validator' });
      expect(client.definitions.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'code-validator' })
      );
    });
  });

  describe('create_definition', () => {
    it('registers the tool with correct name', () => {
      registerCreateDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('create_definition');
    });
  });

  describe('SDK error handling in tools', () => {
    it('maps SDK errors to MCP error responses', async () => {
      const failingClient = createMockRegistryClient({
        list: vi.fn().mockRejectedValue(new Error('Connection refused')),
      });
      server = createMockServer();
      registerListDefinitionsTool(server, failingClient);

      const result = await server.tools[0].handler({});
      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Connection refused');
    });
  });
});
