/**
 * Tool registry - registers all MCP tools
 */

import { z } from 'zod';
import type { ZodRawShape } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration, ToolHandler } from '../types/index.js';

/**
 * Zod schema for the `fields` meta-parameter.
 * Added to every tool's MCP schema so clients can discover and send it.
 * Actual extraction/filtering is handled centrally in createToolHandler.
 */
const FIELDS_PARAM = z
  .array(z.string())
  .optional()
  .describe(
    'Response fields to include. Filters each response item to only these fields. Pagination metadata (total, limit, offset, hasMore) is always preserved.'
  );

/**
 * Wraps a server to inject the `fields` meta-parameter into every tool's schema.
 * This makes `fields` visible to MCP clients (JSON schema) without modifying
 * individual tool files. The handler-level extraction in createToolHandler
 * removes `fields` before Zod validation, so tool schemas remain unaware.
 */
function withFieldsParam(server: McpServerToolRegistration): McpServerToolRegistration {
  return {
    tool(name: string, description: string, schema: ZodRawShape, handler: ToolHandler): void {
      server.tool(name, description, { ...schema, fields: FIELDS_PARAM }, handler);
    },
  };
}

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
import { registerArchiveDefinitionTool } from './archive-definition.js';
import { registerDeleteDefinitionTool } from './delete-definition.js';
import { registerUpdateAndPublishTool } from './update-and-publish.js';
import { registerBatchPublishTool } from './batch-publish.js';
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

// P3 Analytics Tools
import { registerGetEffectivenessTool } from './get-effectiveness.js';
import { registerGetHealthTool } from './get-health.js';
import { registerGetEcosystemOverviewTool } from './get-ecosystem-overview.js';
import { registerGetLineageTool } from './get-lineage.js';
import { registerGetEvolutionTool } from './get-evolution.js';
import { registerGetTranslationAnalyticsTool } from './get-translation-analytics.js';
import { registerCompareEffectivenessTool } from './compare-effectiveness.js';
import { registerGetDiffImpactTool } from './get-diff-impact.js';

/**
 * Register all 42 MCP tools with the server.
 * @param server - MCP server instance to register tools on.
 * @param registryClient - Registry SDK client for API calls.
 */
export function registerAllTools(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  // Wrap server to inject `fields` meta-parameter into every tool's schema
  const s = withFieldsParam(server);

  // Session management (no registryClient needed)
  registerSetDefaultTypeTool(s);

  // P0 Core tools
  registerListDefinitionsTool(s, registryClient);
  registerGetDefinitionTool(s, registryClient);
  registerSearchDefinitionsTool(s, registryClient);
  registerListModelsTool(s, registryClient);
  registerResolveAliasTool(s, registryClient);
  registerValidateDefinitionTool(s, registryClient);
  registerRenderDefinitionTool(s, registryClient);

  // P1 Extended tools
  registerCreateDefinitionTool(s, registryClient);
  registerUpdateDefinitionTool(s, registryClient);
  registerPublishDefinitionTool(s, registryClient);
  registerDeprecateDefinitionTool(s, registryClient);
  registerArchiveDefinitionTool(s, registryClient);
  registerDeleteDefinitionTool(s, registryClient);
  registerUpdateAndPublishTool(s, registryClient);
  registerBatchPublishTool(s, registryClient);
  registerListVersionsTool(s, registryClient);
  registerDiffVersionsTool(s, registryClient);
  registerGetDependenciesTool(s, registryClient);
  registerGetDependentsTool(s, registryClient);
  registerGetExecutionStatsTool(s, registryClient);
  registerListForksTool(s, registryClient);

  // P2 Admin/Specialized tools
  registerForkDefinitionTool(s, registryClient);
  registerCheckForkableTool(s, registryClient);
  registerGetForkLineageTool(s, registryClient);
  registerRecordExecutionTool(s, registryClient);
  registerRetranslateDefinitionTool(s, registryClient);
  registerUpgradeDefinitionTool(s, registryClient);
  registerGetModelTool(s, registryClient);
  registerListProvidersTool(s, registryClient);
  registerListAliasesTool(s, registryClient);
  registerGetTranslatorVersionTool(s, registryClient);
  registerSyncModelsTool(s, registryClient);
  registerGetUserTool(s, registryClient);
  registerBatchUsersTool(s, registryClient);

  // P3 Analytics tools
  registerGetEffectivenessTool(s, registryClient);
  registerGetHealthTool(s, registryClient);
  registerGetEcosystemOverviewTool(s, registryClient);
  registerGetLineageTool(s, registryClient);
  registerGetEvolutionTool(s, registryClient);
  registerGetTranslationAnalyticsTool(s, registryClient);
  registerCompareEffectivenessTool(s, registryClient);
  registerGetDiffImpactTool(s, registryClient);
}
