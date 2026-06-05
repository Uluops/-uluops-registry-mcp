/**
 * Shared error-classification helpers for tool handlers.
 *
 * These guards exist so individual tools don't reimplement substring-match
 * heuristics that need to stay aligned with the registry API's error
 * messaging. Centralizing them here means a single update site if the API
 * error wording changes.
 */

import { isValidationError } from '@uluops/registry-sdk/errors';

/**
 * Detects the "cannot modify in 'published' status" validation error
 * returned by the registry API when the caller targets an already-published
 * version. Used by tools that implement smart-version-up-and-create
 * fallback behavior (update_definition, update_and_publish).
 *
 * NOTE: this is substring-coupled to the API error message format. If the
 * API changes that wording, this guard goes silent and the affected fallback
 * paths stop triggering. Keep this in sync with uluops-registry-api's
 * status-transition validator.
 */
export function isPublishedStatusError(error: unknown): boolean {
  return (
    isValidationError(error) &&
    error instanceof Error &&
    error.message.includes("'published' status")
  );
}
