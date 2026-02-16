/**
 * Definitions MCP resource
 */

import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerResourceRegistration } from '../types/index.js';
import { createResourceResponse, createErrorResourceResponse } from './response-helpers.js';

export function registerDefinitionsResource(
  server: McpServerResourceRegistration,
  registryClient: RegistryClient
): void {
  server.resource(
    'definitions',
    'registry://definitions',
    {
      description: 'List published definitions in the registry',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const result = await registryClient.definitions.list({
          status: 'published',
          limit: 100,
        });
        return createResourceResponse('registry://definitions', result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResourceResponse('registry://definitions', message);
      }
    }
  );
}
