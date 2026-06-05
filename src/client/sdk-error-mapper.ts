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
  if (error !== null && typeof error === 'object' && 'statusCode' in error) {
    return (error as { statusCode: number }).statusCode;
  }
  return undefined;
}

/**
 * Validate that a server-supplied URL is safe to embed in MCP responses.
 *
 * The 402 handler embeds `upgradeUrl` from the API response into MCP text
 * that AI agents read as context. A compromised or attacker-controlled API
 * could emit `javascript:`, `data:`, or untrusted-host URLs as prompt-
 * injection bait. This guard restricts the embedded URL to:
 *   - https:// only (no javascript:/data:/file:/http:)
 *   - hosts ending in `.uluops.ai` or the apex `uluops.ai`
 *
 * Mirrors the SSRF defense in config/index.ts for symmetry — outgoing
 * payload URLs face the same trust constraints as incoming registry URLs.
 */
function isSafeUpgradeUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'uluops.ai') return true;
  if (hostname.endsWith('.uluops.ai')) return true;
  return false;
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

export interface ExtractedErrorContext {
  /** Sanitized human-readable message. */
  message: string;
  /** HTTP status code if available on the SDK error. */
  status?: number;
  /** 402-only: tier required for access. */
  required_tier?: string;
  /** 402-only: caller's current tier. */
  current_tier?: string;
  /** 402-only: definition reference. */
  definition?: { type?: string; name?: string };
  /** 402-only: upgrade URL (mcp-source-tagged). */
  upgrade_url?: string;
  /** 409-only: next available version hint. */
  nextAvailable?: unknown;
  /** 429-only: server-recommended retry delay in seconds. */
  retry_after?: number;
}

/**
 * Extract the same structured-error fields as `mapSdkErrorToMcp` produces,
 * but without wrapping them in an `McpToolResponse`. Useful inside batch
 * loops where each per-item failure should embed the rich error context
 * (402 upgrade URL, 429 retry-after, 409 nextAvailable) into the parent
 * response rather than producing one MCP error envelope per failure.
 */
export function extractErrorContext(error: unknown): ExtractedErrorContext {
  const status = getStatusCode(error);

  if (status === 402) {
    const details = (error as { details?: Record<string, unknown> }).details ?? {};
    const requiredTier = typeof details['requiredTier'] === 'string' ? details['requiredTier'] : undefined;
    const currentTier = typeof details['currentTier'] === 'string' ? details['currentTier'] : undefined;
    const def = (details['definition'] !== null && typeof details['definition'] === 'object')
      ? details['definition'] as { type?: string; name?: string }
      : undefined;
    const rawUpgradeUrl = typeof details['upgradeUrl'] === 'string' ? details['upgradeUrl'] : undefined;
    // Drop server-supplied URLs that don't pass the protocol/host guard.
    // A compromised or attacker-controlled API could emit javascript:/data:
    // or off-domain URLs as prompt-injection bait for the consuming agent.
    const safeUpgradeUrl = rawUpgradeUrl !== undefined && isSafeUpgradeUrl(rawUpgradeUrl)
      ? rawUpgradeUrl
      : undefined;
    const sep = safeUpgradeUrl?.includes('?') === true ? '&' : '?';
    const trackedUrl = safeUpgradeUrl !== undefined ? `${safeUpgradeUrl}${sep}source=mcp` : undefined;
    return {
      message: sanitizeErrorMessage(getErrorMessage(error, 'Subscription required')),
      status,
      ...(requiredTier !== undefined ? { required_tier: requiredTier } : {}),
      ...(currentTier !== undefined ? { current_tier: currentTier } : {}),
      ...(def !== undefined ? { definition: def } : {}),
      ...(trackedUrl !== undefined ? { upgrade_url: trackedUrl } : {}),
    };
  }

  if (isRateLimitError(error)) {
    const details = (error as { details?: Record<string, unknown> }).details ?? {};
    const retryAfter = typeof details['retryAfter'] === 'number' ? details['retryAfter'] : undefined;
    return {
      message: sanitizeErrorMessage(getErrorMessage(error, 'Rate limit exceeded')),
      status,
      ...(retryAfter !== undefined ? { retry_after: retryAfter } : {}),
    };
  }

  if (isConflictError(error)) {
    const details = 'details' in (error as object)
      ? (error as { details?: Record<string, unknown> }).details
      : undefined;
    const nextAvailable = details?.['nextAvailable'];
    return {
      message: sanitizeErrorMessage(getErrorMessage(error, 'Resource conflict')),
      ...(status !== undefined ? { status } : {}),
      ...(nextAvailable !== undefined ? { nextAvailable } : {}),
    };
  }

  return {
    message: sanitizeErrorMessage(getErrorMessage(error, 'Unknown error')),
    ...(status !== undefined ? { status } : {}),
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
      statusCode !== undefined ? { status: statusCode } : undefined,
    );
  }

  if (isRateLimitError(error)) {
    const retryAfter = (error as { retryAfter?: number }).retryAfter;
    const hasRetryAfter = typeof retryAfter === 'number' && retryAfter > 0;
    return buildErrorResponse(
      hasRetryAfter
        ? `Rate limit exceeded. Retry after ${String(retryAfter)} seconds.`
        : 'Rate limit exceeded, please retry later.',
      { status: 429, ...(hasRetryAfter ? { retry_after_seconds: retryAfter } : {}) },
    );
  }

  if (isValidationError(error)) {
    return buildErrorResponse(
      sanitizeErrorMessage(getErrorMessage(error, 'Invalid request parameters')),
      statusCode !== undefined ? { status: statusCode } : undefined,
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
    const rawUpgradeUrl = details.upgradeUrl as string | undefined;
    // Restrict the embedded URL to https://*.uluops.ai to prevent
    // server-controlled prompt-injection bait reaching the agent's context.
    const safeUpgradeUrl = rawUpgradeUrl !== undefined && isSafeUpgradeUrl(rawUpgradeUrl)
      ? rawUpgradeUrl
      : undefined;
    const sep = safeUpgradeUrl?.includes('?') === true ? '&' : '?';
    const trackedUrl = safeUpgradeUrl !== undefined ? `${safeUpgradeUrl}${sep}source=mcp` : undefined;

    const defLabel = def?.name !== undefined && def.name !== ''
      ? `${def.type ?? 'definition'}/${def.name}`
      : 'this definition';
    const tierLabel = requiredTier !== undefined && requiredTier !== ''
      ? ` Requires ${requiredTier} tier or higher.`
      : '';
    const currentLabel = currentTier !== undefined && currentTier !== ''
      ? ` Your current tier: ${currentTier}.`
      : '';

    return buildErrorResponse(
      `Subscription required to access ${defLabel}.${tierLabel}${currentLabel}` +
      (trackedUrl !== undefined ? ` Upgrade: ${trackedUrl}` : ''),
      {
        status: 402,
        ...(requiredTier !== undefined && requiredTier !== '' ? { required_tier: requiredTier } : {}),
        ...(currentTier !== undefined && currentTier !== '' ? { current_tier: currentTier } : {}),
        ...(def !== undefined ? { definition: def } : {}),
        ...(trackedUrl !== undefined ? { upgrade_url: trackedUrl } : {}),
      },
    );
  }

  if (isConflictError(error)) {
    // Extract details (e.g. nextAvailable version) from SDK ConflictError
    const details = 'details' in error
      ? (error as { details?: Record<string, unknown> }).details
      : undefined;
    const nextAvailable = details?.nextAvailable;
    return buildErrorResponse(
      sanitizeErrorMessage(getErrorMessage(error, 'Resource conflict')),
      {
        ...(statusCode !== undefined ? { status: statusCode } : {}),
        ...(nextAvailable !== undefined && nextAvailable !== null ? { nextAvailable } : {}),
      },
    );
  }

  if (isUnprocessableError(error)) {
    return buildErrorResponse(
      sanitizeErrorMessage(getErrorMessage(error, 'Unprocessable request')),
      statusCode !== undefined ? { status: statusCode } : undefined,
    );
  }

  if (isRegistryApiError(error)) {
    return buildErrorResponse(
      sanitizeErrorMessage(getErrorMessage(error, 'Internal server error')),
      statusCode !== undefined ? { status: statusCode } : undefined,
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
