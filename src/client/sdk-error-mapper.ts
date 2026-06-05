/**
 * Error mapper for converting Registry SDK errors to MCP-safe responses
 *
 * Maps @uluops/registry-sdk error hierarchy to sanitized MCP tool responses.
 * Credential redaction delegated to @uluops/sdk-core's sanitizeString().
 */

import {
  isRegistryApiError,
  isNotFoundError,
  isRateLimitError,
  isValidationError,
  UnauthorizedError,
  ForbiddenError,
  isConflictError,
  isUnprocessableError,
} from '@uluops/registry-sdk/errors';
import { sanitizeString } from '@uluops/sdk-core';
import type { ZodError } from 'zod';
import type { McpToolResponse } from '../types/index.js';

/**
 * Sanitize an error message for safe client exposure.
 * Delegates to @uluops/sdk-core's sanitizeString() for credential redaction
 * and truncation.
 */
export const sanitizeErrorMessage = sanitizeString;

/** Safely extract a message from an unknown error value */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

/** Extract HTTP status code from SDK errors when available */
function getStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return (error as { statusCode: number }).statusCode;
  }
  return undefined;
}

/** Build a structured error response with optional metadata */
function buildErrorResponse(
  message: string,
  metadata?: Record<string, unknown>,
): McpToolResponse {
  const payload: Record<string, unknown> = { error: message };
  if (metadata) {
    Object.assign(payload, metadata);
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    isError: true,
  };
}

/**
 * Map an SDK error to an MCP tool response.
 *
 * Preserves error context including:
 * - Original error messages (with credential redaction only)
 * - HTTP status codes when available
 * - Retry-after information for rate limits
 * - Field-level validation details
 */
export function mapSdkErrorToMcp(error: unknown): McpToolResponse {
  const statusCode = getStatusCode(error);

  if (isNotFoundError(error)) {
    return buildErrorResponse(
      sanitizeErrorMessage(getErrorMessage(error, 'Resource not found')),
      statusCode ? { status: statusCode } : undefined,
    );
  }

  if (isRateLimitError(error)) {
    const retryAfter = (error as { retryAfter?: number }).retryAfter;
    return buildErrorResponse(
      retryAfter
        ? `Rate limit exceeded. Retry after ${String(retryAfter)} seconds.`
        : 'Rate limit exceeded, please retry later.',
      { status: 429, ...(retryAfter ? { retry_after_seconds: retryAfter } : {}) },
    );
  }

  if (isValidationError(error)) {
    return buildErrorResponse(
      sanitizeErrorMessage(getErrorMessage(error, 'Invalid request parameters')),
      statusCode ? { status: statusCode } : undefined,
    );
  }

  if (error instanceof UnauthorizedError) {
    return buildErrorResponse(
      'Authentication required. Verify ULUOPS_API_KEY is set to a valid ulr_* key.',
      { status: 401 },
    );
  }

  if (error instanceof ForbiddenError) {
    return buildErrorResponse(
      sanitizeErrorMessage(getErrorMessage(error, 'Access denied')),
      { status: 403 },
    );
  }

  // 402 Subscription Required — content gating (spec Section 9.2)
  if (statusCode === 402) {
    const details = (error as { details?: Record<string, unknown> }).details ?? {};
    const requiredTier = details.requiredTier as string | undefined;
    const currentTier = details.currentTier as string | undefined;
    const def = details.definition as { type?: string; name?: string } | undefined;
    const upgradeUrl = details.upgradeUrl as string | undefined;
    const sep = upgradeUrl?.includes('?') ? '&' : '?';
    const trackedUrl = upgradeUrl ? `${upgradeUrl}${sep}source=mcp` : undefined;

    const defLabel = def?.name ? `${def.type ?? 'definition'}/${def.name}` : 'this definition';
    const tierLabel = requiredTier ? ` Requires ${requiredTier} tier or higher.` : '';
    const currentLabel = currentTier ? ` Your current tier: ${currentTier}.` : '';

    return buildErrorResponse(
      `Subscription required to access ${defLabel}.${tierLabel}${currentLabel}` +
      (trackedUrl ? ` Upgrade: ${trackedUrl}` : ''),
      {
        status: 402,
        ...(requiredTier ? { required_tier: requiredTier } : {}),
        ...(currentTier ? { current_tier: currentTier } : {}),
        ...(def ? { definition: def } : {}),
        ...(trackedUrl ? { upgrade_url: trackedUrl } : {}),
      },
    );
  }

  if (isConflictError(error)) {
    // Extract details (e.g. nextAvailable version) from SDK ConflictError
    const details = 'details' in error
      ? (error as { details?: Record<string, unknown> }).details
      : undefined;
    return buildErrorResponse(
      sanitizeErrorMessage(getErrorMessage(error, 'Resource conflict')),
      {
        ...(statusCode ? { status: statusCode } : {}),
        ...(details?.nextAvailable ? { nextAvailable: details.nextAvailable } : {}),
      },
    );
  }

  if (isUnprocessableError(error)) {
    return buildErrorResponse(
      sanitizeErrorMessage(getErrorMessage(error, 'Unprocessable request')),
      statusCode ? { status: statusCode } : undefined,
    );
  }

  if (isRegistryApiError(error)) {
    return buildErrorResponse(
      sanitizeErrorMessage(getErrorMessage(error, 'Internal server error')),
      statusCode ? { status: statusCode } : undefined,
    );
  }

  if (error instanceof Error) {
    return buildErrorResponse(sanitizeErrorMessage(error.message));
  }

  return buildErrorResponse('An unexpected error occurred');
}

/**
 * Map a Zod validation error to an MCP tool response.
 * Shows all validation errors with field paths and expected values.
 */
export function mapZodErrorToMcp(error: unknown): McpToolResponse {
  let message = 'Invalid input parameters';

  if (error instanceof Error && 'issues' in error) {
    const zodError = error as ZodError<unknown>;
    const details = zodError.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    const count = zodError.issues.length;
    message = `Validation failed (${String(count)} error${count > 1 ? 's' : ''}): ${details}`;
  }

  return buildErrorResponse(message, { status: 400 });
}
