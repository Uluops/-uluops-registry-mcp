#!/usr/bin/env node
/**
 * UluOps Registry MCP Client
 *
 * Thin protocol adapter that enables Claude Code to interact with
 * the UluOps Registry API via MCP, using @uluops/registry-sdk.
 */

import { fileURLToPath } from 'node:url';
import { SecureMcpServer } from 'mcp-secure-server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { RegistryClient } from '@uluops/registry-sdk';

import { loadConfig, validateConfig, VERSION } from './config/index.js';
import { toolRegistry } from './config/tool-registry.js';
import { registerAllTools } from './tools/index.js';
import { registerAllResources } from './resources/index.js';
import { createLogger } from './utils/logger.js';

async function main(): Promise<void> {
  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    // stdout for --version is conventional (not stderr which is for MCP protocol messages)
    process.stdout.write(VERSION + '\n');
    process.exit(0);
  }

  const config = loadConfig();
  const { warnings: configWarnings } = validateConfig(config);

  const logger = createLogger({
    level: config.security.logLevel,
    enableFileLogging: config.security.enableLogging,
    logDir: config.security.logDir,
  });

  for (const warning of configWarnings) {
    logger.warn(warning);
  }

  logger.info('Starting UluOps Registry MCP client', {
    version: config.server.version,
    apiUrl: config.api.baseUrl ?? '(SDK default)',
  });

  // Retry config applies to all requests including writes. This is safe because:
  // - The SDK only retries on network errors and 5xx responses (not 4xx)
  // - Registry API write operations are idempotent (create returns existing on conflict)
  // Detect auth type: ulr_ prefix = API key, otherwise = session token
  const isApiKey = config.api.apiKey?.startsWith('ulr_');
  const registryClient = new RegistryClient({
    baseUrl: config.api.baseUrl,
    ...(isApiKey ? { apiKey: config.api.apiKey } : { sessionToken: config.api.apiKey }),
    orgSlug: config.api.orgSlug,
    timeout: config.api.timeout,
    retries: config.api.retries,
  });

  const server = await SecureMcpServer.create(config.server, {
    securityLevel: 'basic',
    maxRequestsPerMinute: 120,
    maxMessageSize: 500 * 1024,
    maxParamCount: 500,

    burstThreshold: 15,
    burstWindowMs: 5000,
    // Disabled: this MCP server is designed for programmatic use by Claude Code;
    // automation is the expected usage pattern, not abuse.
    automationDetection: {
      enabled: false,
    },

    toolRegistry,

    defaultPolicy: {
      allowWrites: true,
      allowNetwork: true,
    },

    resourcePolicy: {
      allowedSchemes: ['registry'],
    },

    enableLogging: config.security.enableLogging,
    verboseLogging: config.security.verboseLogging,
    logPerformanceMetrics: config.security.logPerformanceMetrics,
  });

  registerAllTools(server, registryClient);
  registerAllResources(server, registryClient);

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    process.exit(0);
  };

  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
    process.exit(1);
  });

  const transport = new StdioServerTransport();
  // StdioServerTransport satisfies the MCP SDK's Transport interface structurally,
  // but the types originate from different packages. Validate at runtime before casting.
  if (typeof transport.start !== 'function' || typeof transport.close !== 'function') {
    throw new Error('StdioServerTransport does not satisfy Transport interface');
  }
  await server.connect(transport as Parameters<typeof server.connect>[0]);

  logger.info('MCP server connected and ready', {
    tools: {
      session: ['set_default_type'],
      p0_core: [
        'list_definitions',
        'get_definition',
        'search_definitions',
        'list_models',
        'resolve_alias',
        'validate_definition',
        'render_definition',
      ],
      p1_extended: [
        'create_definition',
        'update_definition',
        'publish_definition',
        'deprecate_definition',
        'delete_definition',
        'update_and_publish',
        'batch_publish',
        'list_versions',
        'diff_versions',
        'get_dependencies',
        'get_dependents',
        'get_execution_stats',
        'list_forks',
      ],
      p2_admin: [
        'fork_definition',
        'is_forkable',
        'get_fork_lineage',
        'record_execution',
        'retranslate_definition',
        'upgrade_definition',
        'get_model',
        'list_providers',
        'list_aliases',
        'get_translator_version',
        'get_user',
        'batch_users',
        'list_languages',
        'get_language',
      ],
    },
    resources: [
      'registry://definitions',
      'registry://models',
      'registry://definition-types',
      'registry://providers',
    ],
  });
}

export { main };

// Auto-run main() only when this module is the program entry point.
// Tests import `{ main }` directly and call it themselves; they do not
// need (and previously relied on a fragile `NODE_ENV=test` guard to
// suppress) auto-execution. The ESM-standard entry-point check below is
// stable across NODE_ENV values, so a stray `NODE_ENV=test` in the user's
// shell no longer silently stops the server from starting.
const isEntryPoint =
  typeof process.argv[1] === 'string' &&
  process.argv[1] === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  main().catch((error: unknown) => {
    // console.error is intentional here — logger may not be initialized yet at startup
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to start MCP client:', message);
    process.exit(1);
  });
}
