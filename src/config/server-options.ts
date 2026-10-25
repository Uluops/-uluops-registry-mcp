/**
 * SecureMcpServer options for @uluops/registry-mcp.
 *
 * Moved out of main() (0.18.0) so a test can build the exact production options without
 * starting the server. api-limits.test.ts sends the largest request the registry API
 * accepts through a real pipeline built from these.
 */

import { createRequire } from 'node:module';
import type { SecureMcpServer } from 'mcp-secure-server';
import { toolRegistry } from './tool-registry.js';
import { ENVELOPE_BYTES } from './limits.js';

const require = createRequire(import.meta.url);

// The bundled tool-policies.json (shipped in `files`). It MUST be passed explicitly:
// mcp-secure-server's default lookup is TOOL_POLICIES_PATH -> <cwd>/tool-policies.json ->
// ~/.config/mcp-secure-server/, and under an MCP host the cwd is the user's project, so
// through 0.8.1 this file was never loaded and none of its relaxations were in effect.
// Same resolution as @uluops/ops-mcp.
// Two levels up: this module builds to dist/config/.
export const TOOL_POLICIES_PATH = require.resolve('../../tool-policies.json');

export function buildServerOptions(
  security: { enableLogging: boolean; verboseLogging: boolean; logPerformanceMetrics: boolean },
): Parameters<typeof SecureMcpServer.create>[1] {
  return {
    securityLevel: 'basic',
    toolPoliciesPath: TOOL_POLICIES_PATH,
    maxRequestsPerMinute: 120,
    maxMessageSize: ENVELOPE_BYTES,
    // Raise the per-string-parameter cap from the secure-server default (5000)
    // to the message ceiling. Definition tools (validate/create/update) carry
    // full YAML / runtime markdown in a single string field that routinely
    // exceeds 5000 chars; the yaml tools' maxArgsSize is set to this same envelope,
    // so the default string cap was the artificial bottleneck. Requires
    // mcp-secure-server >= 0.0.17, which exposes maxStringLength at create time.
    maxStringLength: ENVELOPE_BYTES,
    maxParamCount: 500,
    // Raise the Layer 2 serialized-params cap (default 50000 bytes) and the
    // Layer 3 suspicious-message block (basic preset: 50000 bytes) to the
    // message ceiling — definition YAML payloads routinely exceed 50KB and
    // the yaml tools' maxArgsSize is set to this same envelope. Requires
    // mcp-secure-server >= 0.0.19-security (maxParamBytes).
    maxParamBytes: ENVELOPE_BYTES,
    suspiciousMessageSize: ENVELOPE_BYTES,

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

    enableLogging: security.enableLogging,
    verboseLogging: security.verboseLogging,
    logPerformanceMetrics: security.logPerformanceMetrics,
  };
}
