/**
 * Models MCP resource
 */

import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerResourceRegistration } from '../types/index.js';
import { createResourceResponse, createErrorResourceResponse } from './response-helpers.js';
import { sanitizeErrorMessage } from '../client/sdk-error-mapper.js';

const RESOURCE_TIMEOUT_MS = 15_000;

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
        const result = await Promise.race([
          registryClient.models.list(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Resource request timed out')), RESOURCE_TIMEOUT_MS)
          ),
        ]);
        return createResourceResponse('registry://models', result);
      } catch (error) {
        const raw = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResourceResponse('registry://models', sanitizeErrorMessage(raw));
      }
    }
  );
}
