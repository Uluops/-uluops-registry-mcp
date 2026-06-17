/**
 * get_language tool
 *
 * Get a definition language with its JSON Schema. Returns a compact schema
 * digest by default (sufficient to author a definition); pass format:'full'
 * for the complete JSON Schema with exact validation constraints.
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';
import { compactSchemaContent } from '../utils/compact-schema.js';

export const GetLanguageInputSchema = z.object({
  language_id: z.enum(['adl', 'cdl', 'wdl', 'pdl']).describe('Language identifier'),
  format: z
    .enum(['compact', 'full'])
    .optional()
    .default('compact')
    .describe(
      "Response verbosity. 'compact' (default) returns a condensed digest — field names, types, " +
        'required flags, complete enums, $defs as ref-pointers, one-line descriptions — sufficient ' +
        "to author a definition (~50-75% smaller). 'full' returns the complete JSON Schema with " +
        'patterns, length/range bounds, and examples for exact validation.',
    ),
});

export function registerGetLanguageTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'get_language',
    'Get a definition language with its JSON Schema. Returns a compact schema digest by default ' +
      "(sufficient to author a definition); pass format:'full' for the complete JSON Schema.",
    GetLanguageInputSchema.shape,
    createToolHandler(GetLanguageInputSchema, async (n) => {
      const language = await registryClient.languages.get(n.languageId);
      if (n.format === 'full') {
        return language;
      }
      return {
        ...language,
        schema: {
          ...language.schema,
          format: 'compact',
          content: compactSchemaContent(language.schema.content),
        },
      };
    })
  );
}
