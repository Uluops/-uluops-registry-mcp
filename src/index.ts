#!/usr/bin/env node
/**
 * UluOps Registry MCP Client
 *
 * Thin protocol adapter that enables Claude Code to interact with
 * the UluOps Registry API via MCP, using @uluops/registry-sdk.
 */

import { realpathSync } from 'node:fs';
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
  // Detect auth type: ulr_ prefix = API key, otherwise = session token.
  // Explicit `=== true` to handle the nullable-boolean case from optional
  // chaining (undefined apiKey → undefined isApiKey, falls to session-token).
  const isApiKey = config.api.apiKey?.startsWith('ulr_') === true;
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
    // Raise the per-string-parameter cap from the secure-server default (5000)
    // to the message ceiling. Definition tools (validate/create/update) carry
    // full YAML / runtime markdown in a single string field that routinely
    // exceeds 5000 chars; the per-tool maxArgsSize already allows 500KB–1MB,
    // so the default string cap was the artificial bottleneck. Requires
    // mcp-secure-server >= 0.0.17, which exposes maxStringLength at create time.
    maxStringLength: 500 * 1024,
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
// suppress) auto-execution.
//
// `process.argv[1]` may be a symlink (this is exactly how `npx -y` invokes
// scoped bins — npx creates a `node_modules/.bin/<name>` symlink in a temp
// dir and exec's that), while `import.meta.url` always resolves to the
// real on-disk path of THIS file. A literal string equality would silently
// return false under npx and main() would never run — the server would
// exit 0 with no output, breaking every Codex/Claude harness that pins
// this package via `npx -y @uluops/registry-mcp@<v>`. Resolving both sides
// through realpath normalizes that case while preserving the test-import
// path (which leaves argv[1] pointing at vitest's runner, not at this
// file — the comparison still correctly returns false).
function resolvedEqualsModule(): boolean {
  if (typeof process.argv[1] !== 'string') return false;
  try {
    return (
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

const isEntryPoint = resolvedEqualsModule();

if (isEntryPoint) {
  main().catch((error: unknown) => {
    // console.error is intentional here — logger may not be initialized yet at startup
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to start MCP client:', message);
    process.exit(1);
  });
}
