/**
 * get_translator_version tool
 *
 * Get current translator version.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetTranslatorVersionInputSchema = z.object({});

export function registerGetTranslatorVersionTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_translator_version',
    'Get the current definition translator version.',
    GetTranslatorVersionInputSchema.shape,
    createToolHandler(GetTranslatorVersionInputSchema, () =>
      registryClient.translation.getVersion()
    )
  );
}
