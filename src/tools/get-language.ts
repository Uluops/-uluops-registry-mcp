/**
 * get_language tool
 *
 * Get a definition language with its current JSON Schema.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const GetLanguageInputSchema = z.object({
  language_id: z.enum(['adl', 'cdl', 'wdl', 'pdl']).describe('Language identifier'),
});

export function registerGetLanguageTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_language',
    'Get a definition language with its current JSON Schema. Returns metadata and the full schema document.',
    GetLanguageInputSchema.shape,
    createToolHandler(GetLanguageInputSchema, (n) => registryClient.languages.get(n.languageId))
  );
}
