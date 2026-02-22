import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RegistryClient } from '@uluops/registry-sdk';
import type {
  McpServerResourceRegistration,
  ResourceHandler,
  ResourceMetadata,
} from '../types/index.js';
import { registerDefinitionsResource } from '../resources/definitions.js';
import { registerModelsResource } from '../resources/models.js';
import { registerDefinitionTypesResource } from '../resources/definition-types.js';
import { registerProvidersResource } from '../resources/providers.js';

// --- Test helpers ---

type ResourceEntry = {
  name: string;
  uri: string;
  metadata: ResourceMetadata;
  handler: ResourceHandler;
};

function createMockServer(): McpServerResourceRegistration & { resources: ResourceEntry[] } {
  const resources: ResourceEntry[] = [];
  return {
    resources,
    resource(
      name: string,
      uri: string,
      metadataOrHandler: ResourceMetadata | ResourceHandler,
      handler?: ResourceHandler
    ): void {
      resources.push({
        name,
        uri,
        metadata: metadataOrHandler as ResourceMetadata,
        handler: handler ?? (metadataOrHandler as ResourceHandler),
      });
    },
  };
}

function createMockRegistryClient(): RegistryClient {
  return {
    definitions: {
      list: vi
        .fn()
        .mockResolvedValue({ items: [{ name: 'code-validator', type: 'agent' }], total: 1 }),
    },
    models: {
      list: vi.fn().mockResolvedValue({ items: [{ modelId: 'claude-sonnet-4-5' }], total: 1 }),
      listProviders: vi.fn().mockResolvedValue([{ id: 'anthropic', name: 'Anthropic' }]),
    },
  } as unknown as RegistryClient;
}

// --- Tests ---

describe('Resource Registration & Handlers', () => {
  let server: ReturnType<typeof createMockServer>;
  let client: RegistryClient;

  beforeEach(() => {
    server = createMockServer();
    client = createMockRegistryClient();
  });

  describe('definitions resource', () => {
    it('registers with correct name and URI', () => {
      registerDefinitionsResource(server, client);
      expect(server.resources[0].name).toBe('definitions');
      expect(server.resources[0].uri).toBe('registry://definitions');
    });

    it('calls SDK with status=published and limit=100', async () => {
      registerDefinitionsResource(server, client);
      await server.resources[0].handler();
      expect(client.definitions.list).toHaveBeenCalledWith({
        status: 'published',
        limit: 100,
      });
    });

    it('returns resource response with correct URI and data', async () => {
      registerDefinitionsResource(server, client);
      const result = await server.resources[0].handler();
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('registry://definitions');
      expect(result.contents[0].mimeType).toBe('application/json');
      const data = JSON.parse(result.contents[0].text ?? '');
      expect(data.items).toHaveLength(1);
      expect(data.items[0].name).toBe('code-validator');
    });

    it('returns error resource response on SDK failure', async () => {
      (client.definitions.list as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection refused')
      );
      registerDefinitionsResource(server, client);
      const result = await server.resources[0].handler();
      expect(result.contents[0].uri).toBe('registry://definitions');
      const data = JSON.parse(result.contents[0].text ?? '');
      expect(data.error).toBe('Connection refused');
    });

    it('handles non-Error throws gracefully', async () => {
      (client.definitions.list as ReturnType<typeof vi.fn>).mockRejectedValue('string error');
      registerDefinitionsResource(server, client);
      const result = await server.resources[0].handler();
      const data = JSON.parse(result.contents[0].text ?? '');
      expect(data.error).toBe('Unknown error');
    });
  });

  describe('models resource', () => {
    it('registers with correct name and URI', () => {
      registerModelsResource(server, client);
      expect(server.resources[0].name).toBe('models');
      expect(server.resources[0].uri).toBe('registry://models');
    });

    it('calls SDK models.list with no arguments', async () => {
      registerModelsResource(server, client);
      await server.resources[0].handler();
      expect(client.models.list).toHaveBeenCalled();
    });

    it('returns model data in resource response', async () => {
      registerModelsResource(server, client);
      const result = await server.resources[0].handler();
      const data = JSON.parse(result.contents[0].text ?? '');
      expect(data.items[0].modelId).toBe('claude-sonnet-4-5');
    });

    it('returns error resource on failure', async () => {
      (client.models.list as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Timeout'));
      registerModelsResource(server, client);
      const result = await server.resources[0].handler();
      const data = JSON.parse(result.contents[0].text ?? '');
      expect(data.error).toBe('Timeout');
    });
  });

  describe('definition-types resource (static)', () => {
    it('registers with correct name and URI', () => {
      registerDefinitionTypesResource(server);
      expect(server.resources[0].name).toBe('definition-types');
      expect(server.resources[0].uri).toBe('registry://definition-types');
    });

    it('returns all 4 definition types', async () => {
      registerDefinitionTypesResource(server);
      const result = await server.resources[0].handler();
      const data = JSON.parse(result.contents[0].text ?? '') as {
        type: string;
        description: string;
      }[];
      expect(data).toHaveLength(4);
      const types = data.map((d) => d.type);
      expect(types).toEqual(['agent', 'command', 'workflow', 'pipeline']);
    });

    it('each type has a description', async () => {
      registerDefinitionTypesResource(server);
      const result = await server.resources[0].handler();
      const data = JSON.parse(result.contents[0].text ?? '') as {
        type: string;
        description: string;
      }[];
      for (const entry of data) {
        expect(entry.description).toBeTruthy();
      }
    });

    it('does not require a registry client', () => {
      // definition-types is static - no client needed
      registerDefinitionTypesResource(server);
      expect(server.resources).toHaveLength(1);
    });
  });

  describe('providers resource', () => {
    it('registers with correct name and URI', () => {
      registerProvidersResource(server, client);
      expect(server.resources[0].name).toBe('providers');
      expect(server.resources[0].uri).toBe('registry://providers');
    });

    it('calls SDK models.listProviders', async () => {
      registerProvidersResource(server, client);
      await server.resources[0].handler();
      expect(client.models.listProviders).toHaveBeenCalled();
    });

    it('returns provider data in resource response', async () => {
      registerProvidersResource(server, client);
      const result = await server.resources[0].handler();
      const data = JSON.parse(result.contents[0].text ?? '');
      expect(data[0].id).toBe('anthropic');
    });

    it('returns error resource on failure', async () => {
      (client.models.listProviders as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Service unavailable')
      );
      registerProvidersResource(server, client);
      const result = await server.resources[0].handler();
      const data = JSON.parse(result.contents[0].text ?? '');
      expect(data.error).toBe('Service unavailable');
    });
  });
});
