/**
 * list_languages tool
 *
 * List all definition languages (ADL, CDL, WDL, PDL).
 */

import { z } from 'zod';
import type { RegistryClient } from '@uluops/registry-sdk';
import { type McpServerToolRegistration } from '../types/index.js';
import { createToolHandler } from '../utils/tool-handler.js';

export const ListLanguagesInputSchema = z.object({});

export function registerListLanguagesTool(
  server: McpServerToolRegistration,
  registryClient: RegistryClient
): void {
  server.tool(
    'list_languages',
    'List all definition languages (ADL, CDL, WDL, PDL) with current schema version info.',
    ListLanguagesInputSchema.shape,
    createToolHandler(ListLanguagesInputSchema, () => registryClient.languages.list(), { toolName: 'list_languages' })
  );
}
