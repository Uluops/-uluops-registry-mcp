/**
 * Providers MCP resource
 */

import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerResourceRegistration } from '../types/index.js';
import { createResourceResponse, createErrorResourceResponse } from './response-helpers.js';

export function registerProvidersResource(
  server: McpServerResourceRegistration,
  registryClient: RegistryClient
): void {
  server.resource(
    'providers',
    'registry://providers',
    {
      description: 'List AI model providers',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const result = await registryClient.models.listProviders();
        return createResourceResponse('registry://providers', result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResourceResponse('registry://providers', message);
      }
    }
  );
}
