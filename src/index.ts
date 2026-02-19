#!/usr/bin/env node
/**
 * UluOps Registry MCP Client
 *
 * Thin protocol adapter that enables Claude Code to interact with
 * the UluOps Registry API via MCP, using @uluops/registry-sdk.
 */

import { SecureMcpServer } from 'mcp-secure-server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { RegistryClient } from '@uluops/registry-sdk';
import { createRequire } from 'module';

import { loadConfig, validateConfig } from './config/index.js';
import { toolRegistry } from './config/tool-registry.js';
import { registerAllTools } from './tools/index.js';
import { registerAllResources } from './resources/index.js';
import { createLogger } from './utils/logger.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

async function main(): Promise<void> {
  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    console.log(version);
    process.exit(0);
  }

  const config = loadConfig();
  validateConfig(config);

  const logger = createLogger({
    level: config.security.logLevel,
    enableFileLogging: config.security.enableLogging,
    logDir: config.security.logDir,
  });

  logger.info('Starting UluOps Registry MCP client', {
    version,
    apiUrl: config.api.baseUrl,
  });

  const registryClient = new RegistryClient({
    baseUrl: config.api.baseUrl,
    apiKey: config.api.apiKey,
    timeout: config.api.timeout,
    retries: config.api.retries,
  });

  const server = await SecureMcpServer.create(
    {
      name: 'uluops-registry-client',
      version,
    },
    {
      securityLevel: 'basic',
      maxRequestsPerMinute: 120,
      maxMessageSize: 500 * 1024,
      maxParamCount: 500,

      burstThreshold: 15,
      burstWindowMs: 5000,
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
    }
  );

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
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
    process.exit(1);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport as Parameters<typeof server.connect>[0]);

  logger.info('MCP server connected and ready', {
    tools: {
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
        'list_versions',
        'diff_versions',
        'get_dependencies',
        'get_dependents',
        'get_execution_stats',
        'list_forks',
      ],
      p2_admin: [
        'fork_definition',
        'check_forkable',
        'get_fork_lineage',
        'record_execution',
        'retranslate_definition',
        'upgrade_definition',
        'get_model',
        'list_providers',
        'list_aliases',
        'get_translator_version',
        'sync_models',
        'get_user',
        'batch_users',
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

if (process.env.NODE_ENV !== 'test') {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to start MCP client:', message);
    process.exit(1);
  });
}
