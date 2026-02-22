/**
 * Tool registry - registers all MCP tools
 */

import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';

// Session management
import { registerSetDefaultTypeTool } from './set-default-type.js';

// P0 Core Tools
import { registerListDefinitionsTool } from './list-definitions.js';
import { registerGetDefinitionTool } from './get-definition.js';
import { registerSearchDefinitionsTool } from './search-definitions.js';
import { registerListModelsTool } from './list-models.js';
import { registerResolveAliasTool } from './resolve-alias.js';
import { registerValidateDefinitionTool } from './validate-definition.js';
import { registerRenderDefinitionTool } from './render-definition.js';

// P1 Extended Tools
import { registerCreateDefinitionTool } from './create-definition.js';
import { registerUpdateDefinitionTool } from './update-definition.js';
import { registerPublishDefinitionTool } from './publish-definition.js';
import { registerDeprecateDefinitionTool } from './deprecate-definition.js';
import { registerDeleteDefinitionTool } from './delete-definition.js';
import { registerListVersionsTool } from './list-versions.js';
import { registerDiffVersionsTool } from './diff-versions.js';
import { registerGetDependenciesTool } from './get-dependencies.js';
import { registerGetDependentsTool } from './get-dependents.js';
import { registerGetExecutionStatsTool } from './get-execution-stats.js';
import { registerListForksTool } from './list-forks.js';

// P2 Admin/Specialized Tools
import { registerForkDefinitionTool } from './fork-definition.js';
import { registerCheckForkableTool } from './check-forkable.js';
import { registerGetForkLineageTool } from './get-fork-lineage.js';
import { registerRecordExecutionTool } from './record-execution.js';
import { registerRetranslateDefinitionTool } from './retranslate-definition.js';
import { registerUpgradeDefinitionTool } from './upgrade-definition.js';
import { registerGetModelTool } from './get-model.js';
import { registerListProvidersTool } from './list-providers.js';
import { registerListAliasesTool } from './list-aliases.js';
import { registerGetTranslatorVersionTool } from './get-translator-version.js';
import { registerSyncModelsTool } from './sync-models.js';
import { registerGetUserTool } from './get-user.js';
import { registerBatchUsersTool } from './batch-users.js';

/**
 * Register all 32 MCP tools with the server.
 * @param server - MCP server instance to register tools on.
 * @param registryClient - Registry SDK client for API calls.
 */
export function registerAllTools(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  // Session management (no registryClient needed)
  registerSetDefaultTypeTool(server);

  // P0 Core tools
  registerListDefinitionsTool(server, registryClient);
  registerGetDefinitionTool(server, registryClient);
  registerSearchDefinitionsTool(server, registryClient);
  registerListModelsTool(server, registryClient);
  registerResolveAliasTool(server, registryClient);
  registerValidateDefinitionTool(server, registryClient);
  registerRenderDefinitionTool(server, registryClient);

  // P1 Extended tools
  registerCreateDefinitionTool(server, registryClient);
  registerUpdateDefinitionTool(server, registryClient);
  registerPublishDefinitionTool(server, registryClient);
  registerDeprecateDefinitionTool(server, registryClient);
  registerDeleteDefinitionTool(server, registryClient);
  registerListVersionsTool(server, registryClient);
  registerDiffVersionsTool(server, registryClient);
  registerGetDependenciesTool(server, registryClient);
  registerGetDependentsTool(server, registryClient);
  registerGetExecutionStatsTool(server, registryClient);
  registerListForksTool(server, registryClient);

  // P2 Admin/Specialized tools
  registerForkDefinitionTool(server, registryClient);
  registerCheckForkableTool(server, registryClient);
  registerGetForkLineageTool(server, registryClient);
  registerRecordExecutionTool(server, registryClient);
  registerRetranslateDefinitionTool(server, registryClient);
  registerUpgradeDefinitionTool(server, registryClient);
  registerGetModelTool(server, registryClient);
  registerListProvidersTool(server, registryClient);
  registerListAliasesTool(server, registryClient);
  registerGetTranslatorVersionTool(server, registryClient);
  registerSyncModelsTool(server, registryClient);
  registerGetUserTool(server, registryClient);
  registerBatchUsersTool(server, registryClient);
}
