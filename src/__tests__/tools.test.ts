import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';

// Session management
import { registerSetDefaultTypeTool } from '../tools/set-default-type.js';
import { setDefaultType } from '../utils/session-state.js';

// --- Tool register imports (all 31 + session) ---
// Definitions
import { registerListDefinitionsTool } from '../tools/list-definitions.js';
import { registerGetDefinitionTool } from '../tools/get-definition.js';
import { registerSearchDefinitionsTool } from '../tools/search-definitions.js';
import { registerCreateDefinitionTool } from '../tools/create-definition.js';
import { registerUpdateDefinitionTool } from '../tools/update-definition.js';
import { registerPublishDefinitionTool } from '../tools/publish-definition.js';
import { registerDeprecateDefinitionTool } from '../tools/deprecate-definition.js';
import { registerDeleteDefinitionTool } from '../tools/delete-definition.js';
import { registerUpdateAndPublishTool } from '../tools/update-and-publish.js';
import { registerBatchPublishTool } from '../tools/batch-publish.js';
// Models
import { registerListModelsTool } from '../tools/list-models.js';
import { registerGetModelTool } from '../tools/get-model.js';
import { registerResolveAliasTool } from '../tools/resolve-alias.js';
import { registerListProvidersTool } from '../tools/list-providers.js';
import { registerListAliasesTool } from '../tools/list-aliases.js';
import { registerSyncModelsTool } from '../tools/sync-models.js';
// Versions
import { registerListVersionsTool } from '../tools/list-versions.js';
import { registerDiffVersionsTool } from '../tools/diff-versions.js';
// Dependencies
import { registerGetDependenciesTool } from '../tools/get-dependencies.js';
import { registerGetDependentsTool } from '../tools/get-dependents.js';
// Forks
import { registerListForksTool } from '../tools/list-forks.js';
import { registerCheckForkableTool } from '../tools/check-forkable.js';
import { registerGetForkLineageTool } from '../tools/get-fork-lineage.js';
import { registerForkDefinitionTool } from '../tools/fork-definition.js';
// Executions
import { registerRecordExecutionTool } from '../tools/record-execution.js';
import { registerGetExecutionStatsTool } from '../tools/get-execution-stats.js';
// Translation
import { registerRetranslateDefinitionTool } from '../tools/retranslate-definition.js';
import { registerGetTranslatorVersionTool } from '../tools/get-translator-version.js';
import { registerUpgradeDefinitionTool } from '../tools/upgrade-definition.js';
// Validation & Render
import { registerValidateDefinitionTool } from '../tools/validate-definition.js';
import { registerRenderDefinitionTool } from '../tools/render-definition.js';
// Users
import { registerGetUserTool } from '../tools/get-user.js';
import { registerBatchUsersTool } from '../tools/batch-users.js';

// Mock node:fs/promises for render_definition output_path write tests
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);
const mockLstat = vi.fn().mockRejectedValue(new Error('ENOENT'));

vi.mock('node:fs/promises', () => ({
  writeFile: (...args: unknown[]): Promise<void> => mockWriteFile(...args) as Promise<void>,
  mkdir: (...args: unknown[]): Promise<void> => mockMkdir(...args) as Promise<void>,
  lstat: (...args: unknown[]): Promise<unknown> => mockLstat(...args) as Promise<unknown>,
}));

// Mock the registry SDK error module
// Default: all type guards return false. Tests can override per-call via mockReturnValueOnce.
const mockIsNotFoundError = vi.fn().mockReturnValue(false);
const mockIsValidationError = vi.fn().mockReturnValue(false);

vi.mock('@uluops/registry-sdk/errors', () => ({
  isRegistryApiError: (): boolean => false,
  isNotFoundError: (...args: unknown[]): boolean => mockIsNotFoundError(...args) as boolean,
  isRateLimitError: (): boolean => false,
  isValidationError: (...args: unknown[]): boolean => mockIsValidationError(...args) as boolean,
  isConflictError: (): boolean => false,
  isUnprocessableError: (): boolean => false,
  UnauthorizedError: class extends Error {},
  ForbiddenError: class extends Error {},
}));

// Mock resolveYamlInput for file_path tests.
// The real resolveYamlInput calls readYamlFile internally; here we mock both
// so that file_path resolution returns known test content.
import { createErrorResponse } from '../types/mcp.js';

const FILE_CONTENT = 'name: from-file\nversion: 1.0.0';
const mockReadYamlFile = vi.fn().mockReturnValue(FILE_CONTENT);

vi.mock('../utils/read-yaml-file.js', () => ({
  readYamlFile: (...args: unknown[]): string => mockReadYamlFile(...args) as string,
  resolveYamlInput: <T extends { yaml?: string; file_path?: string }>(
    input: T,
    options: { required: boolean }
  ): T | { content: { type: string; text: string }[]; isError: boolean } => {
    if (options.required && input.yaml === undefined && input.file_path === undefined) {
      return createErrorResponse('Provide either yaml or file_path');
    }
    if (input.yaml !== undefined && input.file_path !== undefined) {
      return createErrorResponse('Provide only one of yaml or file_path, not both');
    }
    if (input.file_path !== undefined) {
      const content = mockReadYamlFile(input.file_path) as string;
      return { ...input, yaml: content };
    }
    return input;
  },
}));

// --- Test helpers ---

type ToolEntry = {
  name: string;
  description: string;
  schema: unknown;
  handler: (
    args: unknown
  ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
};

function createMockServer(): McpServerToolRegistration & { tools: ToolEntry[] } {
  const tools: ToolEntry[] = [];
  return {
    tools,
    tool(name: string, description: string, schema: unknown, handler: ToolEntry['handler']): void {
      tools.push({ name, description, schema, handler });
    },
  };
}

function createMockRegistryClient(): RegistryClient {
  return {
    definitions: {
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      get: vi.fn().mockResolvedValue({ name: 'test', type: 'agent' }),
      search: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      create: vi.fn().mockResolvedValue({ name: 'new-def', type: 'agent' }),
      update: vi.fn().mockResolvedValue({ name: 'test', type: 'agent' }),
      publish: vi.fn().mockResolvedValue({ name: 'test', status: 'published' }),
      deprecate: vi.fn().mockResolvedValue({ name: 'test', status: 'deprecated' }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    models: {
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      get: vi.fn().mockResolvedValue({ provider: 'anthropic', modelId: 'claude-sonnet-4-5' }),
      resolveAlias: vi
        .fn()
        .mockResolvedValue({ provider: 'anthropic', modelId: 'claude-sonnet-4-5' }),
      listProviders: vi.fn().mockResolvedValue([{ id: 'anthropic', name: 'Anthropic' }]),
      listAliases: vi.fn().mockResolvedValue([{ alias: 'sonnet', provider: 'anthropic' }]),
      sync: vi.fn().mockResolvedValue({ synced: 5 }),
    },
    versions: {
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      diff: vi.fn().mockResolvedValue({ changes: [] }),
    },
    dependencies: {
      get: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
      getDependents: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
    },
    forks: {
      list: vi.fn().mockResolvedValue({ forks: [], totalForks: 0 }),
      checkForkable: vi.fn().mockResolvedValue({ forkable: true }),
      getLineage: vi.fn().mockResolvedValue({ isFork: false }),
      create: vi.fn().mockResolvedValue({ name: 'forked-def', type: 'agent' }),
    },
    executions: {
      record: vi.fn().mockResolvedValue({ recorded: true }),
      getStats: vi.fn().mockResolvedValue({ totalExecutions: 0 }),
    },
    translation: {
      retranslate: vi.fn().mockResolvedValue({ retranslated: true }),
      getVersion: vi.fn().mockResolvedValue({ version: '2.0.0' }),
      upgrade: vi.fn().mockResolvedValue({ upgraded: true }),
    },
    validation: {
      validate: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
    },
    render: {
      get: vi.fn().mockResolvedValue({ markdown: '# Test' }),
    },
    users: {
      get: vi.fn().mockResolvedValue({ id: 'user-1', displayName: 'Test User' }),
      batch: vi.fn().mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]),
    },
  } as unknown as RegistryClient;
}

function getHandler(server: ReturnType<typeof createMockServer>): ToolEntry['handler'] {
  return server.tools[0].handler;
}

function parseResult(result: { content: { text: string }[] }): unknown {
  return JSON.parse(result.content[0].text);
}

// --- Tests ---

describe('Tool Registration & SDK Calls', () => {
  let server: ReturnType<typeof createMockServer>;
  let client: RegistryClient;

  beforeEach(() => {
    server = createMockServer();
    client = createMockRegistryClient();
    mockReadYamlFile.mockClear();
    mockWriteFile.mockClear();
    mockMkdir.mockClear();
    mockIsNotFoundError.mockReset().mockReturnValue(false);
    mockIsValidationError.mockReset().mockReturnValue(false);
  });

  // ═══════════════════════════════════════════
  // DEFINITIONS DOMAIN (8 tools)
  // ═══════════════════════════════════════════

  describe('list_definitions', () => {
    it('registers with correct name', () => {
      registerListDefinitionsTool(server, client);
      expect(server.tools[0].name).toBe('list_definitions');
    });

    it('passes normalized args as object to SDK', async () => {
      registerListDefinitionsTool(server, client);
      await getHandler(server)({ type: 'agent', status: 'published' });
      expect(client.definitions.list).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'agent', status: 'published' })
      );
    });

    it('remaps page→offset, sort→sortBy, order→sortOrder, tags→tag', async () => {
      registerListDefinitionsTool(server, client);
      await getHandler(server)({
        page: 2,
        limit: 10,
        sort: 'name',
        order: 'desc',
        tags: ['security'],
      });
      expect(client.definitions.list).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 10,
          limit: 10,
          sortBy: 'name',
          sortOrder: 'desc',
          tag: ['security'],
        })
      );
    });

    it('returns data as JSON with correct response shape', async () => {
      const mockData = { items: [{ name: 'test' }], total: 1 };
      (client.definitions.list as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
      registerListDefinitionsTool(server, client);
      const result = await getHandler(server)({});
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(parseResult(result)).toEqual(mockData);
    });

    it('passes domain, agent_type, visibility, and search filters individually', async () => {
      registerListDefinitionsTool(server, client);
      await getHandler(server)({
        domain: 'software',
        agent_type: 'validator',
        visibility: 'public',
        search: 'test',
      });
      expect(client.definitions.list).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'software',
          agentType: 'validator',
          visibility: 'public',
          search: 'test',
        })
      );
    });

    it('omits undefined optional filters from SDK query', async () => {
      registerListDefinitionsTool(server, client);
      await getHandler(server)({ type: 'agent' });
      const call = (client.definitions.list as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(call).toHaveProperty('type', 'agent');
      expect(call).not.toHaveProperty('domain');
      expect(call).not.toHaveProperty('agentType');
      expect(call).not.toHaveProperty('search');
    });

    it('computes offset=0 when page=1 (first page)', async () => {
      registerListDefinitionsTool(server, client);
      // Default limit is 20; page 1 should map to offset 0
      await getHandler(server)({ page: 1, limit: 20 });
      expect(client.definitions.list).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, limit: 20 })
      );
    });

    it('rejects invalid enum values', async () => {
      registerListDefinitionsTool(server, client);
      const result = await getHandler(server)({ type: 'invalid_type' });
      expect(result.isError).toBe(true);
    });
  });

  describe('get_definition', () => {
    it('registers with correct name', () => {
      registerGetDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('get_definition');
    });

    it('passes positional args and options to SDK', async () => {
      registerGetDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'code-validator',
        version: '1.0.0',
        include_yaml: true,
        include_runtime: false,
      });
      expect(client.definitions.get).toHaveBeenCalledWith(
        'agent',
        'code-validator',
        '1.0.0',
        expect.objectContaining({ includeYaml: true, includeRuntime: false })
      );
    });

    it('returns response with correct shape', async () => {
      registerGetDefinitionTool(server, client);
      const result = await getHandler(server)({ type: 'agent', name: 'code-validator' });
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const parsed = parseResult(result) as { name: string };
      expect(parsed.name).toBe('test');
    });

    it('rejects missing required name', async () => {
      registerGetDefinitionTool(server, client);
      const result = await getHandler(server)({ type: 'agent' });
      expect(result.isError).toBe(true);
    });
  });

  describe('search_definitions', () => {
    it('registers with correct name', () => {
      registerSearchDefinitionsTool(server, client);
      expect(server.tools[0].name).toBe('search_definitions');
    });

    it('maps query to definitions.list search param', async () => {
      registerSearchDefinitionsTool(server, client);
      await getHandler(server)({ query: 'code-validator', type: 'agent' });
      expect(client.definitions.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'code-validator', type: 'agent' })
      );
    });

    it('rejects empty query', async () => {
      registerSearchDefinitionsTool(server, client);
      const result = await getHandler(server)({ query: '' });
      expect(result.isError).toBe(true);
    });

    it('passes agent_type, visibility, and tags to SDK', async () => {
      registerSearchDefinitionsTool(server, client);
      await getHandler(server)({
        query: 'validate',
        agent_type: 'validator',
        visibility: 'public',
        tags: ['security', 'code'],
      });
      expect(client.definitions.list).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'validate',
          agentType: 'validator',
          visibility: 'public',
          tag: ['security', 'code'],
        })
      );
    });
  });

  describe('create_definition', () => {
    it('registers with correct name', () => {
      registerCreateDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('create_definition');
    });

    it('passes type, name as positional and options object', async () => {
      registerCreateDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'my-agent',
        yaml: 'name: my-agent',
        visibility: 'public',
      });
      expect(client.definitions.create).toHaveBeenCalledWith(
        'agent',
        'my-agent',
        expect.objectContaining({ yaml: 'name: my-agent', visibility: 'public' })
      );
    });

    it('rejects when neither yaml nor file_path provided', async () => {
      registerCreateDefinitionTool(server, client);
      const result = await getHandler(server)({ type: 'agent', name: 'test' });
      expect(result.isError).toBe(true);
    });

    it('reads yaml from file_path when provided', async () => {
      registerCreateDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'my-agent',
        file_path: '/home/user/def.yaml',
      });
      expect(mockReadYamlFile).toHaveBeenCalledWith('/home/user/def.yaml');
      expect(client.definitions.create).toHaveBeenCalledWith(
        'agent',
        'my-agent',
        expect.objectContaining({ yaml: 'name: from-file\nversion: 1.0.0' })
      );
    });

    it('rejects when both yaml and file_path provided', async () => {
      registerCreateDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'my-agent',
        yaml: 'name: inline',
        file_path: '/home/user/def.yaml',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('update_definition', () => {
    it('registers with correct name', () => {
      registerUpdateDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('update_definition');
    });

    it('passes type, name, version as positional and body with conditional props', async () => {
      registerUpdateDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        yaml: 'updated: true',
        visibility: 'private',
        description: 'Updated desc',
        tags: ['v2'],
        change_type: 'minor',
      });
      expect(client.definitions.update).toHaveBeenCalledWith(
        'agent',
        'test',
        '1.0.0',
        expect.objectContaining({
          yaml: 'updated: true',
          visibility: 'private',
          description: 'Updated desc',
          tags: ['v2'],
          changeType: 'minor',
        })
      );
    });

    it('only includes defined optional fields in body', async () => {
      registerUpdateDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        yaml: 'content: here',
      });
      const body = (client.definitions.update as ReturnType<typeof vi.fn>).mock
        .calls[0][3] as Record<string, unknown>;
      expect(body).toHaveProperty('yaml');
      expect(body).not.toHaveProperty('visibility');
      expect(body).not.toHaveProperty('description');
      expect(body).not.toHaveProperty('tags');
      expect(body).not.toHaveProperty('changeType');
    });

    it('reads yaml from file_path when provided', async () => {
      registerUpdateDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        file_path: '/home/user/def.yaml',
      });
      expect(mockReadYamlFile).toHaveBeenCalledWith('/home/user/def.yaml');
      const body = (client.definitions.update as ReturnType<typeof vi.fn>).mock
        .calls[0][3] as Record<string, unknown>;
      expect(body).toHaveProperty('yaml', 'name: from-file\nversion: 1.0.0');
    });

    it('rejects when both yaml and file_path provided', async () => {
      registerUpdateDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        yaml: 'inline: yaml',
        file_path: '/home/user/def.yaml',
      });
      expect(result.isError).toBe(true);
    });

    it('allows neither yaml nor file_path (update other fields only)', async () => {
      registerUpdateDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        visibility: 'private',
      });
      expect(result.isError).toBeUndefined();
      expect(mockReadYamlFile).not.toHaveBeenCalled();
    });

    // Smart version-up: auto-create on NotFoundError or published status
    it('auto-creates when version not found and yaml provided', async () => {
      const notFoundErr = new Error('Definition not found: agent/test@2.0.0');
      (client.definitions.update as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
      mockIsNotFoundError.mockImplementation((e: unknown) => e === notFoundErr);
      (client.definitions.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        name: 'test',
        type: 'agent',
        version: '2.0.0',
        status: 'draft',
      });

      registerUpdateDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '2.0.0',
        yaml: 'name: test\nversion: 2.0.0',
      });

      expect(result.isError).toBeUndefined();
      expect(client.definitions.create).toHaveBeenCalledWith('agent', 'test', {
        yaml: 'name: test\nversion: 2.0.0',
      });
      const parsed = parseResult(result) as { version: string; _note: string };
      expect(parsed.version).toBe('2.0.0');
      expect(parsed._note).toContain("not found");
      expect(parsed._note).toContain("Created new draft");
    });

    it('auto-creates when version is published and yaml provided', async () => {
      const publishedErr = new Error(
        "Cannot modify definition in 'published' status. Only draft definitions can be modified."
      );
      (client.definitions.update as ReturnType<typeof vi.fn>).mockRejectedValue(publishedErr);
      mockIsValidationError.mockImplementation((e: unknown) => e === publishedErr);
      (client.definitions.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        name: 'test',
        type: 'agent',
        version: '1.1.0',
        status: 'draft',
      });

      registerUpdateDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        yaml: 'name: test\nversion: 1.1.0',
        visibility: 'public',
      });

      expect(result.isError).toBeUndefined();
      expect(client.definitions.create).toHaveBeenCalledWith('agent', 'test', {
        yaml: 'name: test\nversion: 1.1.0',
        visibility: 'public',
      });
      const parsed = parseResult(result) as { version: string; _note: string };
      expect(parsed.version).toBe('1.1.0');
      expect(parsed._note).toContain("published");
      expect(parsed._note).toContain("Created new draft");
    });

    it('propagates published error when no yaml provided', async () => {
      const publishedErr = new Error(
        "Cannot modify definition in 'published' status. Only draft definitions can be modified."
      );
      (client.definitions.update as ReturnType<typeof vi.fn>).mockRejectedValue(publishedErr);
      mockIsValidationError.mockImplementation((e: unknown) => e === publishedErr);

      registerUpdateDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        visibility: 'private',
      });

      expect(result.isError).toBe(true);
      expect(client.definitions.create).not.toHaveBeenCalled();
    });

    it('trims yaml/runtimeMd in response via postProcess hook', async () => {
      (client.definitions.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        name: 'test',
        type: 'agent',
        yaml: 'a'.repeat(200),
        runtimeMd: 'b'.repeat(300),
      });
      registerUpdateDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        yaml: 'updated: true',
      });
      expect(result.isError).toBeUndefined();
      const parsed = parseResult(result) as { yaml: string; runtimeMd: string };
      expect(parsed.yaml).toContain('(200 chars)');
      expect(parsed.runtimeMd).toContain('(300 chars)');
    });

    it('propagates non-recoverable errors even with yaml', async () => {
      (client.definitions.update as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection refused')
      );

      registerUpdateDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        yaml: 'name: test',
      });

      expect(result.isError).toBe(true);
      expect(client.definitions.create).not.toHaveBeenCalled();
    });
  });

  describe('publish_definition', () => {
    it('registers with correct name', () => {
      registerPublishDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('publish_definition');
    });

    it('passes type, name, version as positional args', async () => {
      registerPublishDefinitionTool(server, client);
      await getHandler(server)({ type: 'workflow', name: 'ship', version: '2.0.0' });
      expect(client.definitions.publish).toHaveBeenCalledWith('workflow', 'ship', '2.0.0');
    });
  });

  describe('deprecate_definition', () => {
    it('registers with correct name', () => {
      registerDeprecateDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('deprecate_definition');
    });

    it('passes positional args plus options with reason and successor', async () => {
      registerDeprecateDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'old-agent',
        version: '1.0.0',
        reason: 'Replaced by v2',
        successor: 'new-agent',
      });
      expect(client.definitions.deprecate).toHaveBeenCalledWith(
        'agent',
        'old-agent',
        '1.0.0',
        expect.objectContaining({ reason: 'Replaced by v2', successor: 'new-agent' })
      );
    });

    it('omits successor when not provided', async () => {
      registerDeprecateDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'old-agent',
        version: '1.0.0',
        reason: 'No longer needed',
      });
      const opts = (client.definitions.deprecate as ReturnType<typeof vi.fn>).mock
        .calls[0][3] as Record<string, unknown>;
      expect(opts.reason).toBe('No longer needed');
      expect(opts).not.toHaveProperty('successor');
    });
  });

  describe('delete_definition', () => {
    it('registers with correct name', () => {
      registerDeleteDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('delete_definition');
    });

    it('passes type, name, version as positional args', async () => {
      registerDeleteDefinitionTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(client.definitions.delete).toHaveBeenCalledWith('agent', 'test', '1.0.0');
    });

    it('returns success: true for void response', async () => {
      registerDeleteDefinitionTool(server, client);
      const result = await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(result.isError).toBeUndefined();
      expect(parseResult(result)).toEqual({ success: true });
    });

    it('rejects missing version', async () => {
      registerDeleteDefinitionTool(server, client);
      const result = await getHandler(server)({ type: 'agent', name: 'test' });
      expect(result.isError).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // COMPOSITE WORKFLOW TOOLS
  // ═══════════════════════════════════════════

  describe('update_and_publish', () => {
    it('registers with correct name', () => {
      registerUpdateAndPublishTool(server, client);
      expect(server.tools[0].name).toBe('update_and_publish');
    });

    it('updates then publishes in one step', async () => {
      registerUpdateAndPublishTool(server, client);
      (client.definitions.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        name: 'my-agent', version: '1.0.0', type: 'agent', status: 'draft',
      });
      (client.definitions.publish as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        name: 'my-agent', version: '1.0.0', type: 'agent', status: 'published',
      });

      const result = await getHandler(server)({
        type: 'agent', name: 'my-agent', version: '1.0.0',
        yaml: 'name: my-agent\nversion: 1.0.0',
      });

      expect(result.isError).toBeUndefined();
      expect(client.definitions.update).toHaveBeenCalledWith(
        'agent', 'my-agent', '1.0.0',
        expect.objectContaining({ yaml: 'name: my-agent\nversion: 1.0.0' })
      );
      expect(client.definitions.publish).toHaveBeenCalledWith('agent', 'my-agent', '1.0.0');
      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed._note).toBe('Updated and published in one step');
    });

    it('falls back to create when version not found', async () => {
      registerUpdateAndPublishTool(server, client);
      const notFoundError = new Error('Not found');
      (client.definitions.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(notFoundError);
      // isNotFoundError is called twice: once in isPublishedStatusError guard (returns false
      // because isValidationError is false), then in the if-condition itself.
      mockIsNotFoundError.mockReturnValue(true);
      (client.definitions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        name: 'my-agent', version: '2.0.0', type: 'agent',
      });
      (client.definitions.publish as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        name: 'my-agent', version: '2.0.0', type: 'agent', status: 'published',
      });

      const result = await getHandler(server)({
        type: 'agent', name: 'my-agent', version: '1.0.0',
        yaml: 'name: my-agent\nversion: 2.0.0',
      });

      mockIsNotFoundError.mockReturnValue(false);

      expect(result.isError).toBeUndefined();
      expect(client.definitions.create).toHaveBeenCalled();
      expect(client.definitions.publish).toHaveBeenCalledWith('agent', 'my-agent', '2.0.0');
      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed._note).toContain('not found');
    });

    it('returns error when publish fails after update', async () => {
      registerUpdateAndPublishTool(server, client);
      (client.definitions.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        name: 'my-agent', version: '1.0.0', type: 'agent',
      });
      (client.definitions.publish as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Cannot publish')
      );

      const result = await getHandler(server)({
        type: 'agent', name: 'my-agent', version: '1.0.0',
      });

      expect(result.isError).toBe(true);
    });

    it('resolves file_path input', async () => {
      registerUpdateAndPublishTool(server, client);
      (client.definitions.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        name: 'my-agent', version: '1.0.0', type: 'agent',
      });
      (client.definitions.publish as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        name: 'my-agent', version: '1.0.0', type: 'agent', status: 'published',
      });

      const result = await getHandler(server)({
        type: 'agent', name: 'my-agent', version: '1.0.0',
        file_path: '/workspace/agent.yaml',
      });

      expect(result.isError).toBeUndefined();
      expect(client.definitions.update).toHaveBeenCalledWith(
        'agent', 'my-agent', '1.0.0',
        expect.objectContaining({ yaml: expect.any(String) })
      );
    });
  });

  describe('batch_publish', () => {
    it('registers with correct name', () => {
      registerBatchPublishTool(server, client);
      expect(server.tools[0].name).toBe('batch_publish');
    });

    it('publishes all definitions successfully', async () => {
      registerBatchPublishTool(server, client);
      (client.definitions.publish as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ name: 'a', version: '1.0.0', status: 'published' })
        .mockResolvedValueOnce({ name: 'b', version: '1.0.0', status: 'published' });

      const result = await getHandler(server)({
        definitions: [
          { type: 'agent', name: 'a', version: '1.0.0' },
          { type: 'agent', name: 'b', version: '1.0.0' },
        ],
      });

      expect(result.isError).toBeUndefined();
      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.summary).toBe('Published 2 of 2 definitions');
      expect((parsed.published as unknown[]).length).toBe(2);
      expect((parsed.failed as unknown[]).length).toBe(0);
    });

    it('handles partial failures', async () => {
      registerBatchPublishTool(server, client);
      (client.definitions.publish as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ name: 'a', version: '1.0.0', status: 'published' })
        .mockRejectedValueOnce(new Error('Not found'));

      const result = await getHandler(server)({
        definitions: [
          { type: 'agent', name: 'a', version: '1.0.0' },
          { type: 'agent', name: 'b', version: '2.0.0' },
        ],
      });

      expect(result.isError).toBeUndefined();
      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.summary).toBe('Published 1 of 2 definitions');
      expect((parsed.published as unknown[]).length).toBe(1);
      const failed = parsed.failed as Record<string, unknown>[];
      expect(failed.length).toBe(1);
      expect(failed[0].name).toBe('b');
    });

    it('rejects empty definitions array', async () => {
      registerBatchPublishTool(server, client);
      const result = await getHandler(server)({ definitions: [] });
      expect(result.isError).toBe(true);
    });

    it('rejects more than 20 definitions', async () => {
      registerBatchPublishTool(server, client);
      const definitions = Array.from({ length: 21 }, (_, i) => ({
        type: 'agent', name: `agent-${String(i)}`, version: '1.0.0',
      }));
      const result = await getHandler(server)({ definitions });
      expect(result.isError).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // MODELS DOMAIN (6 tools)
  // ═══════════════════════════════════════════

  describe('list_models', () => {
    it('registers with correct name', () => {
      registerListModelsTool(server, client);
      expect(server.tools[0].name).toBe('list_models');
    });

    it('passes filter args as object to SDK', async () => {
      registerListModelsTool(server, client);
      await getHandler(server)({ provider: 'anthropic', tier: 'premium', status: 'available' });
      expect(client.models.list).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'anthropic', tier: 'premium', status: 'available' })
      );
    });

    it('works with empty args and returns success response', async () => {
      registerListModelsTool(server, client);
      const result = await getHandler(server)({});
      expect(client.models.list).toHaveBeenCalledWith(expect.any(Object));
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
    });

    it('returns response with correct shape', async () => {
      registerListModelsTool(server, client);
      const result = await getHandler(server)({});
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const parsed = parseResult(result) as { items: unknown[] };
      expect(parsed).toHaveProperty('items');
    });
  });

  describe('get_model', () => {
    it('registers with correct name', () => {
      registerGetModelTool(server, client);
      expect(server.tools[0].name).toBe('get_model');
    });

    it('passes provider and modelId (camelCased from model_id)', async () => {
      registerGetModelTool(server, client);
      await getHandler(server)({ provider: 'anthropic', model_id: 'claude-sonnet-4-5' });
      expect(client.models.get).toHaveBeenCalledWith('anthropic', 'claude-sonnet-4-5');
    });

    it('rejects missing model_id', async () => {
      registerGetModelTool(server, client);
      const result = await getHandler(server)({ provider: 'anthropic' });
      expect(result.isError).toBe(true);
    });
  });

  describe('resolve_alias', () => {
    it('registers with correct name', () => {
      registerResolveAliasTool(server, client);
      expect(server.tools[0].name).toBe('resolve_alias');
    });

    it('passes alias to SDK', async () => {
      registerResolveAliasTool(server, client);
      await getHandler(server)({ alias: 'sonnet' });
      expect(client.models.resolveAlias).toHaveBeenCalledWith('sonnet');
    });

    it('returns resolved model in response', async () => {
      registerResolveAliasTool(server, client);
      const result = await getHandler(server)({ alias: 'sonnet' });
      expect(result.isError).toBeUndefined();
      const parsed = parseResult(result) as { provider: string; modelId: string };
      expect(parsed.provider).toBe('anthropic');
      expect(parsed.modelId).toBe('claude-sonnet-4-5');
    });
  });

  describe('list_providers (no args)', () => {
    it('registers with correct name', () => {
      registerListProvidersTool(server, client);
      expect(server.tools[0].name).toBe('list_providers');
    });

    it('calls SDK and returns providers in response', async () => {
      registerListProvidersTool(server, client);
      const result = await getHandler(server)({});
      expect(client.models.listProviders).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      const parsed = parseResult(result) as { id: string }[];
      expect(parsed[0].id).toBe('anthropic');
    });
  });

  describe('list_aliases (no args)', () => {
    it('registers with correct name', () => {
      registerListAliasesTool(server, client);
      expect(server.tools[0].name).toBe('list_aliases');
    });

    it('calls SDK and returns aliases in response', async () => {
      registerListAliasesTool(server, client);
      const result = await getHandler(server)({});
      expect(client.models.listAliases).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      const parsed = parseResult(result) as { alias: string }[];
      expect(parsed[0].alias).toBe('sonnet');
    });
  });

  describe('sync_models (no args)', () => {
    it('registers with correct name', () => {
      registerSyncModelsTool(server, client);
      expect(server.tools[0].name).toBe('sync_models');
    });

    it('calls SDK and returns sync result in response', async () => {
      registerSyncModelsTool(server, client);
      const result = await getHandler(server)({});
      expect(client.models.sync).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      const parsed = parseResult(result) as { synced: number };
      expect(parsed.synced).toBe(5);
    });
  });

  // ═══════════════════════════════════════════
  // VERSIONS DOMAIN (2 tools)
  // ═══════════════════════════════════════════

  describe('list_versions', () => {
    it('registers with correct name', () => {
      registerListVersionsTool(server, client);
      expect(server.tools[0].name).toBe('list_versions');
    });

    it('passes type and name as positional args', async () => {
      registerListVersionsTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'code-validator' });
      expect(client.versions.list).toHaveBeenCalledWith('agent', 'code-validator');
    });
  });

  describe('diff_versions', () => {
    it('registers with correct name', () => {
      registerDiffVersionsTool(server, client);
      expect(server.tools[0].name).toBe('diff_versions');
    });

    it('passes type, name, from, to as positional args', async () => {
      registerDiffVersionsTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', from: '1.0.0', to: '2.0.0' });
      expect(client.versions.diff).toHaveBeenCalledWith('agent', 'test', '1.0.0', '2.0.0');
    });

    it('rejects missing from/to', async () => {
      registerDiffVersionsTool(server, client);
      const result = await getHandler(server)({ type: 'agent', name: 'test', from: '1.0.0' });
      expect(result.isError).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // DEPENDENCIES DOMAIN (2 tools)
  // ═══════════════════════════════════════════

  describe('get_dependencies', () => {
    it('registers with correct name', () => {
      registerGetDependenciesTool(server, client);
      expect(server.tools[0].name).toBe('get_dependencies');
    });

    it('passes positional args and maps depth to maxDepth', async () => {
      registerGetDependenciesTool(server, client);
      await getHandler(server)({ type: 'workflow', name: 'ship', version: '1.0.0', depth: 3 });
      expect(client.dependencies.get).toHaveBeenCalledWith(
        'workflow',
        'ship',
        '1.0.0',
        expect.objectContaining({ maxDepth: 3 })
      );
    });

    it('passes empty options when depth not provided', async () => {
      registerGetDependenciesTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      const opts = (client.dependencies.get as ReturnType<typeof vi.fn>).mock.calls[0][3] as Record<
        string,
        unknown
      >;
      expect(opts).toEqual({});
    });
  });

  describe('get_dependents', () => {
    it('registers with correct name', () => {
      registerGetDependentsTool(server, client);
      expect(server.tools[0].name).toBe('get_dependents');
    });

    it('passes type, name, version as positional args', async () => {
      registerGetDependentsTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(client.dependencies.getDependents).toHaveBeenCalledWith('agent', 'test', '1.0.0');
    });
  });

  // ═══════════════════════════════════════════
  // FORKS DOMAIN (4 tools)
  // ═══════════════════════════════════════════

  describe('list_forks', () => {
    it('registers with correct name', () => {
      registerListForksTool(server, client);
      expect(server.tools[0].name).toBe('list_forks');
    });

    it('passes type, name, version as positional args', async () => {
      registerListForksTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(client.forks.list).toHaveBeenCalledWith('agent', 'test', '1.0.0');
    });

    it('returns response with correct shape', async () => {
      registerListForksTool(server, client);
      const result = await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(result.isError).toBeUndefined();
      const parsed = parseResult(result) as { forks: unknown[] };
      expect(parsed).toHaveProperty('forks');
    });
  });

  describe('check_forkable', () => {
    it('registers with correct name', () => {
      registerCheckForkableTool(server, client);
      expect(server.tools[0].name).toBe('check_forkable');
    });

    it('passes type, name, version as positional args', async () => {
      registerCheckForkableTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(client.forks.checkForkable).toHaveBeenCalledWith('agent', 'test', '1.0.0');
    });
  });

  describe('get_fork_lineage', () => {
    it('registers with correct name', () => {
      registerGetForkLineageTool(server, client);
      expect(server.tools[0].name).toBe('get_fork_lineage');
    });

    it('passes type, name, version as positional args', async () => {
      registerGetForkLineageTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(client.forks.getLineage).toHaveBeenCalledWith('agent', 'test', '1.0.0');
    });
  });

  describe('fork_definition', () => {
    it('registers with correct name', () => {
      registerForkDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('fork_definition');
    });

    it('passes positional args and options with newName (camelCased from new_name)', async () => {
      registerForkDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'original',
        version: '1.0.0',
        new_name: 'my-fork',
        description: 'My fork',
      });
      expect(client.forks.create).toHaveBeenCalledWith(
        'agent',
        'original',
        '1.0.0',
        expect.objectContaining({ name: 'my-fork', description: 'My fork' })
      );
    });

    it('omits description when not provided', async () => {
      registerForkDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'original',
        version: '1.0.0',
        new_name: 'my-fork',
      });
      const opts = (client.forks.create as ReturnType<typeof vi.fn>).mock.calls[0][3] as Record<
        string,
        unknown
      >;
      expect(opts.name).toBe('my-fork');
      expect(opts).not.toHaveProperty('description');
    });
  });

  // ═══════════════════════════════════════════
  // EXECUTIONS DOMAIN (2 tools)
  // ═══════════════════════════════════════════

  describe('record_execution', () => {
    it('registers with correct name', () => {
      registerRecordExecutionTool(server, client);
      expect(server.tools[0].name).toBe('record_execution');
    });

    it('passes positional args and options with source and optional runId', async () => {
      registerRecordExecutionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        source: 'cli',
        run_id: 'run-abc',
      });
      expect(client.executions.record).toHaveBeenCalledWith(
        'agent',
        'test',
        '1.0.0',
        expect.objectContaining({ source: 'cli', runId: 'run-abc' })
      );
    });

    it('omits runId when not provided', async () => {
      registerRecordExecutionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
      });
      const opts = (client.executions.record as ReturnType<typeof vi.fn>).mock
        .calls[0][3] as Record<string, unknown>;
      expect(opts.source).toBe('mcp'); // default
      expect(opts).not.toHaveProperty('runId');
    });
  });

  describe('get_execution_stats', () => {
    it('registers with correct name', () => {
      registerGetExecutionStatsTool(server, client);
      expect(server.tools[0].name).toBe('get_execution_stats');
    });

    it('passes type, name, version, window as positional args', async () => {
      registerGetExecutionStatsTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0', window: 30 });
      expect(client.executions.getStats).toHaveBeenCalledWith('agent', 'test', '1.0.0', 30);
    });

    it('passes undefined window when not provided', async () => {
      registerGetExecutionStatsTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(client.executions.getStats).toHaveBeenCalledWith('agent', 'test', '1.0.0', undefined);
    });

    it('returns execution stats in response', async () => {
      registerGetExecutionStatsTool(server, client);
      const result = await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(result.isError).toBeUndefined();
      const parsed = parseResult(result) as { totalExecutions: number };
      expect(parsed.totalExecutions).toBe(0);
    });
  });

  // ═══════════════════════════════════════════
  // TRANSLATION DOMAIN (3 tools)
  // ═══════════════════════════════════════════

  describe('retranslate_definition', () => {
    it('registers with correct name', () => {
      registerRetranslateDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('retranslate_definition');
    });

    it('passes positional args and maps force to createNewVersion', async () => {
      registerRetranslateDefinitionTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0', force: true });
      expect(client.translation.retranslate).toHaveBeenCalledWith(
        'agent',
        'test',
        '1.0.0',
        expect.objectContaining({ createNewVersion: true })
      );
    });

    it('passes empty options when force not provided', async () => {
      registerRetranslateDefinitionTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      const opts = (client.translation.retranslate as ReturnType<typeof vi.fn>).mock
        .calls[0][3] as Record<string, unknown>;
      expect(opts).toEqual({});
    });
  });

  describe('get_translator_version', () => {
    it('registers with correct name', () => {
      registerGetTranslatorVersionTool(server, client);
      expect(server.tools[0].name).toBe('get_translator_version');
    });

    it('calls SDK with empty args and returns version string', async () => {
      registerGetTranslatorVersionTool(server, client);
      const result = await getHandler(server)({});
      expect(client.translation.getVersion).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(parseResult(result)).toEqual({ version: '2.0.0' });
    });
  });

  describe('upgrade_definition', () => {
    it('registers with correct name', () => {
      registerUpgradeDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('upgrade_definition');
    });

    it('passes type, name, and yaml object to SDK', async () => {
      registerUpgradeDefinitionTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', yaml: 'old: format' });
      expect(client.translation.upgrade).toHaveBeenCalledWith(
        'agent',
        'test',
        expect.objectContaining({ yaml: 'old: format' })
      );
    });

    it('rejects when neither yaml nor file_path provided', async () => {
      registerUpgradeDefinitionTool(server, client);
      const result = await getHandler(server)({ type: 'agent', name: 'test' });
      expect(result.isError).toBe(true);
    });

    it('reads yaml from file_path when provided', async () => {
      registerUpgradeDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        name: 'test',
        file_path: '/home/user/legacy.yaml',
      });
      expect(mockReadYamlFile).toHaveBeenCalledWith('/home/user/legacy.yaml');
      expect(client.translation.upgrade).toHaveBeenCalledWith(
        'agent',
        'test',
        expect.objectContaining({ yaml: 'name: from-file\nversion: 1.0.0' })
      );
    });

    it('rejects when both yaml and file_path provided', async () => {
      registerUpgradeDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'test',
        yaml: 'old: format',
        file_path: '/home/user/legacy.yaml',
      });
      expect(result.isError).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // VALIDATION DOMAIN (1 tool)
  // ═══════════════════════════════════════════

  describe('validate_definition', () => {
    it('registers with correct name', () => {
      registerValidateDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('validate_definition');
    });

    it('passes type and yaml as positional args', async () => {
      registerValidateDefinitionTool(server, client);
      await getHandler(server)({ type: 'agent', yaml: 'name: test' });
      expect(client.validation.validate).toHaveBeenCalledWith('agent', 'name: test');
    });

    it('rejects when neither yaml nor file_path provided', async () => {
      registerValidateDefinitionTool(server, client);
      const result = await getHandler(server)({ type: 'agent' });
      expect(result.isError).toBe(true);
    });

    it('reads yaml from file_path when provided', async () => {
      registerValidateDefinitionTool(server, client);
      await getHandler(server)({
        type: 'agent',
        file_path: '/home/user/def.yaml',
      });
      expect(mockReadYamlFile).toHaveBeenCalledWith('/home/user/def.yaml');
      expect(client.validation.validate).toHaveBeenCalledWith(
        'agent',
        'name: from-file\nversion: 1.0.0'
      );
    });

    it('rejects when both yaml and file_path provided', async () => {
      registerValidateDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        yaml: 'name: test',
        file_path: '/home/user/def.yaml',
      });
      expect(result.isError).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // RENDER DOMAIN (1 tool)
  // ═══════════════════════════════════════════

  describe('render_definition', () => {
    it('registers with correct name', () => {
      registerRenderDefinitionTool(server, client);
      expect(server.tools[0].name).toBe('render_definition');
    });

    it('passes type, name, version as positional args (no output_path)', async () => {
      registerRenderDefinitionTool(server, client);
      await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(client.render.get).toHaveBeenCalledWith('agent', 'test', '1.0.0');
    });

    it('returns rendered markdown when no output_path given', async () => {
      registerRenderDefinitionTool(server, client);
      const result = await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.markdown).toBe('# Test');
    });

    it('rejects output_path that escapes base directory', async () => {
      registerRenderDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        output_path: '/etc/passwd',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('output_path must resolve within');
    });

    it('rejects output_path with path traversal', async () => {
      registerRenderDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        output_path: '../../../etc/passwd',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('output_path must resolve within');
    });

    it('returns error when render result has no markdown field', async () => {
      (client.render.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ html: '<p>test</p>' });
      registerRenderDefinitionTool(server, client);
      const result = await getHandler(server)({
        type: 'agent',
        name: 'test',
        version: '1.0.0',
        output_path: './output/test.md',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('missing markdown field');
    });

    it('writes markdown to file when output_path is within base dir', async () => {
      const origBase = process.env['OUTPUT_BASE_DIR'];
      process.env['OUTPUT_BASE_DIR'] = '/tmp/test-output';
      try {
        registerRenderDefinitionTool(server, client);
        const result = await getHandler(server)({
          type: 'agent',
          name: 'test',
          version: '1.0.0',
          output_path: '/tmp/test-output/rendered.md',
        });
        expect(result.isError).toBeUndefined();
        expect(mockMkdir).toHaveBeenCalledWith('/tmp/test-output', { recursive: true });
        expect(mockWriteFile).toHaveBeenCalledWith(
          '/tmp/test-output/rendered.md',
          '# Test',
          'utf-8'
        );
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.success).toBe(true);
        expect(parsed.output_path).toBe('/tmp/test-output/rendered.md');
        expect(parsed.bytes).toBe(Buffer.byteLength('# Test', 'utf-8'));
      } finally {
        if (origBase === undefined) {
          delete process.env['OUTPUT_BASE_DIR'];
        } else {
          process.env['OUTPUT_BASE_DIR'] = origBase;
        }
      }
    });

    it('rejects missing required fields', async () => {
      registerRenderDefinitionTool(server, client);
      const result = await getHandler(server)({ type: 'agent', name: 'test' });
      expect(result.isError).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // USERS DOMAIN (2 tools)
  // ═══════════════════════════════════════════

  describe('get_user', () => {
    it('registers with correct name', () => {
      registerGetUserTool(server, client);
      expect(server.tools[0].name).toBe('get_user');
    });

    it('passes id as positional arg', async () => {
      registerGetUserTool(server, client);
      await getHandler(server)({ id: 'user-123' });
      expect(client.users.get).toHaveBeenCalledWith('user-123');
    });

    it('rejects empty id', async () => {
      registerGetUserTool(server, client);
      const result = await getHandler(server)({ id: '' });
      expect(result.isError).toBe(true);
    });
  });

  describe('batch_users', () => {
    it('registers with correct name', () => {
      registerBatchUsersTool(server, client);
      expect(server.tools[0].name).toBe('batch_users');
    });

    it('passes ids array to SDK', async () => {
      registerBatchUsersTool(server, client);
      await getHandler(server)({ ids: ['user-1', 'user-2', 'user-3'] });
      expect(client.users.batch).toHaveBeenCalledWith(['user-1', 'user-2', 'user-3']);
    });

    it('rejects empty ids array', async () => {
      registerBatchUsersTool(server, client);
      const result = await getHandler(server)({ ids: [] });
      expect(result.isError).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // CROSS-CUTTING: Error handling
  // ═══════════════════════════════════════════

  describe('SDK error handling', () => {
    it('maps SDK errors to MCP error responses', async () => {
      (client.definitions.list as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection refused')
      );
      registerListDefinitionsTool(server, client);
      const result = await getHandler(server)({});
      expect(result.isError).toBe(true);
      const parsed = parseResult(result) as { error: string };
      expect(parsed.error).toBe('Connection refused');
    });

    it('handles void SDK responses as success: true', async () => {
      (client.definitions.publish as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      registerPublishDefinitionTool(server, client);
      const result = await getHandler(server)({ type: 'agent', name: 'test', version: '1.0.0' });
      expect(result.isError).toBeUndefined();
      expect(parseResult(result)).toEqual({ success: true });
    });
  });

  describe('set_default_type', () => {
    beforeEach(() => {
      setDefaultType(undefined);
    });

    it('registers with correct name', () => {
      registerSetDefaultTypeTool(server);
      expect(server.tools[0].name).toBe('set_default_type');
    });

    it('sets a default type and returns session state', async () => {
      registerSetDefaultTypeTool(server);
      const result = await getHandler(server)({ type: 'agent' });
      expect(result.isError).toBeUndefined();
      expect(parseResult(result)).toEqual({ defaultType: 'agent' });
    });

    it('clears default type when type is omitted', async () => {
      registerSetDefaultTypeTool(server);
      await getHandler(server)({ type: 'agent' });
      const result = await getHandler(server)({});
      expect(result.isError).toBeUndefined();
      expect(parseResult(result)).toEqual({ defaultType: undefined });
    });

    it('rejects invalid type values', async () => {
      registerSetDefaultTypeTool(server);
      const result = await getHandler(server)({ type: 'invalid' });
      expect(result.isError).toBe(true);
    });
  });

  describe('session type injection', () => {
    beforeEach(() => {
      setDefaultType(undefined);
    });

    it('injects session type when args.type is not provided', async () => {
      setDefaultType('agent');
      registerListDefinitionsTool(server, client);
      await getHandler(server)({});
      expect(client.definitions.list).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'agent' })
      );
    });

    it('does not override explicit type in args', async () => {
      setDefaultType('agent');
      registerListDefinitionsTool(server, client);
      await getHandler(server)({ type: 'workflow' });
      expect(client.definitions.list).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'workflow' })
      );
    });

    it('does not inject when session type is not set', async () => {
      registerSearchDefinitionsTool(server, client);
      await getHandler(server)({ query: 'test' });
      expect(client.definitions.list).toHaveBeenCalledWith(
        expect.not.objectContaining({ type: expect.any(String) })
      );
    });
  });

  describe('fields parameter', () => {
    it('filters response to requested fields only', async () => {
      (client.definitions.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [
          { name: 'test', type: 'agent', version: '1.0.0', status: 'published', description: 'A test' },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      });
      registerListDefinitionsTool(server, client);
      const result = await getHandler(server)({ fields: ['name', 'version'] });
      const parsed = parseResult(result) as { items: Record<string, unknown>[]; total: number };
      expect(parsed.items[0]).toEqual({ name: 'test', version: '1.0.0' });
      expect(parsed.items[0]).not.toHaveProperty('status');
      expect(parsed.items[0]).not.toHaveProperty('description');
    });

    it('preserves pagination metadata even when not in fields', async () => {
      (client.definitions.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [{ name: 'test', type: 'agent' }],
        total: 1,
        limit: 20,
        offset: 0,
      });
      registerListDefinitionsTool(server, client);
      const result = await getHandler(server)({ fields: ['name'] });
      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.total).toBe(1);
      expect(parsed.limit).toBe(20);
      expect(parsed.offset).toBe(0);
    });

    it('does not filter when fields is not provided', async () => {
      (client.definitions.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [{ name: 'test', type: 'agent', status: 'published' }],
        total: 1,
      });
      registerListDefinitionsTool(server, client);
      const result = await getHandler(server)({});
      const parsed = parseResult(result) as { items: Record<string, unknown>[] };
      expect(parsed.items[0]).toHaveProperty('status');
      expect(parsed.items[0]).toHaveProperty('type');
    });
  });
});
