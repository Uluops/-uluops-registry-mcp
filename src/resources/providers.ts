/**
 * Providers MCP resource
 */

import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerResourceRegistration } from '../types/index.js';
import { createResourceResponse, createErrorResourceResponse } from './response-helpers.js';
import { sanitizeErrorMessage } from '../client/sdk-error-mapper.js';

const RESOURCE_TIMEOUT_MS = 15_000;

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
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          registryClient.models.listProviders(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error('Resource request timed out'));
            }, RESOURCE_TIMEOUT_MS);
          }),
        ]);
        return createResourceResponse('registry://providers', result);
      } catch (error) {
        const raw = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResourceResponse('registry://providers', sanitizeErrorMessage(raw));
      } finally {
        clearTimeout(timer);
      }
    }
  );
}
