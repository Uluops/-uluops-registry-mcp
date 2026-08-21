/**
 * record_execution tool
 *
 * Record an execution (idempotent).
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { ForbiddenError, isForbiddenError } from '@uluops/registry-sdk/errors';
import { DefinitionTypeSchema, type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const RecordExecutionInputSchema = z.object({
  type: DefinitionTypeSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  source: z.string().min(1).default('mcp'),
  run_id: z.string().optional(),
});

export function registerRecordExecutionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'record_execution',
    'Record a definition execution (idempotent). Admin-only: executions are recorded ' +
      'automatically by the UluOps runtime — user API keys do not need to call this.',
    RecordExecutionInputSchema.shape,
    createToolHandler(RecordExecutionInputSchema, async (n) => {
      try {
        return await registryClient.executions.record(n.type, n.name, n.version, {
          source: n.source,
          ...(n.runId !== undefined && { runId: n.runId }),
        });
      } catch (error) {
        // RE-PROBE-02 R16: the API's role gate returns a bare "Requires admin
        // role", which a user-key caller cannot act on. The tool stays in the
        // toolset (the server never learns the caller's role, so it cannot be
        // conditionally hidden) — instead the denial explains whose job the
        // recording is.
        if (isForbiddenError(error)) {
          throw new ForbiddenError(
            'record_execution requires the admin role. Executions are recorded ' +
              'automatically by the UluOps runtime when a definition runs — user ' +
              'API keys do not need to call this tool.'
          );
        }
        throw error;
      }
    })
  );
}
