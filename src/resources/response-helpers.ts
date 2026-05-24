/**
 * Shared response helpers for MCP resources
 */

import type { ResourceResponse } from '../types/index.js';
import { sanitizeErrorMessage } from '../client/sdk-error-mapper.js';

const RESOURCE_TIMEOUT_MS = parseInt(process.env['RESOURCE_TIMEOUT_MS'] ?? '15000', 10);

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

export async function fetchResourceWithTimeout<T>(
  uri: string,
  fetcher: () => Promise<T>
): Promise<ResourceResponse> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      fetcher(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Resource request timed out'));
        }, RESOURCE_TIMEOUT_MS);
      }),
    ]);
    return createResourceResponse(uri, result);
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Unknown error';
    // Log for operator visibility — the sanitized response may hide root cause
    console.error(`[resource:${uri}] fetch error: ${raw}`);
    return createErrorResourceResponse(uri, sanitizeErrorMessage(raw));
  } finally {
    clearTimeout(timer);
  }
}
