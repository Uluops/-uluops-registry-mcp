/**
 * Definitions MCP resource
 */

import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerResourceRegistration } from '../types/index.js';
import { fetchResourceWithTimeout } from './response-helpers.js';

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
    () => fetchResourceWithTimeout('registry://definitions', () =>
      registryClient.definitions.list({ status: 'published', limit: 100 })
    )
  );
}
