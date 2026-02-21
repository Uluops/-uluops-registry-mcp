/**
 * Providers MCP resource
 */

import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerResourceRegistration } from '../types/index.js';
import { fetchResourceWithTimeout } from './response-helpers.js';

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
    () => fetchResourceWithTimeout('registry://providers', () =>
      registryClient.models.listProviders()
    )
  );
}
