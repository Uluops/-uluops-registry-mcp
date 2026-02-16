/**
 * Shared response helpers for MCP resources
 */

import type { ResourceResponse } from '../types/index.js';

export function createResourceResponse(uri: string, data: unknown): ResourceResponse {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function createErrorResourceResponse(uri: string, error: string): ResourceResponse {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ error }),
      },
    ],
  };
}
