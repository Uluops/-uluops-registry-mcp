/**
 * record_execution tool
 *
 * Record an execution (idempotent).
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
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
    'Record a definition execution (idempotent).',
    RecordExecutionInputSchema.shape,
    createToolHandler(RecordExecutionInputSchema, (n) =>
      registryClient.executions.record(n.type, n.name, n.version, {
        source: n.source,
        ...(n.runId !== undefined && { runId: n.runId }),
      })
    )
  );
}
