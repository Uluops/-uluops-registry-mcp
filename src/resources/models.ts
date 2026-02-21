/**
 * Models MCP resource
 */

import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerResourceRegistration } from '../types/index.js';
import { fetchResourceWithTimeout } from './response-helpers.js';

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
    () => fetchResourceWithTimeout('registry://models', () =>
      registryClient.models.list()
    )
  );
}
