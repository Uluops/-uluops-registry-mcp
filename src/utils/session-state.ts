/**
 * Session-level state for the MCP server.
 *
 * Safe to use in-memory because StdioTransport creates a 1:1 relationship
 * between client and server process — there is exactly one session per process.
 * No multi-tenant concerns.
 */

import type { z } from 'zod';
import type { DefinitionTypeSchema } from '../types/index.js';

type DefinitionType = z.infer<typeof DefinitionTypeSchema>;

let defaultType: DefinitionType | undefined;

/** Get the session-level default definition type. */
export function getDefaultType(): DefinitionType | undefined {
  return defaultType;
}

/** Set or clear the session-level default definition type. Pass undefined to clear. */
export function setDefaultType(type: DefinitionType | undefined): void {
  defaultType = type;
}

/** Get the full session state (for returning to callers). */
export function getSessionState(): { defaultType: DefinitionType | undefined } {
  return { defaultType };
}
