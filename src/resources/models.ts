/**
 * Models MCP resource
 */

import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerResourceRegistration } from '../types/index.js';
import { createResourceResponse, createErrorResourceResponse } from './response-helpers.js';

export function registerModelsResource(
  server: McpServerResourceRegistration,
  registryClient: RegistryClient
): void {
  server.resource(
    'models',
    'registry://models',
    {
      description: 'List available AI models',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const result = await registryClient.models.list();
        return createResourceResponse('registry://models', result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResourceResponse('registry://models', message);
      }
    }
  );
}
