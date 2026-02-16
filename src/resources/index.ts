/**
 * Resource registry - registers all MCP resources
 */

import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerResourceRegistration } from '../types/index.js';
import { registerDefinitionsResource } from './definitions.js';
import { registerModelsResource } from './models.js';
import { registerDefinitionTypesResource } from './definition-types.js';
import { registerProvidersResource } from './providers.js';

/**
 * Register all MCP resources
 */
export function registerAllResources(
  server: McpServerResourceRegistration,
  registryClient: RegistryClient
): void {
  registerDefinitionsResource(server, registryClient);
  registerModelsResource(server, registryClient);
  registerDefinitionTypesResource(server);
  registerProvidersResource(server, registryClient);
}
