/**
 * Error mapper for converting Registry SDK errors to MCP-safe responses
 *
 * Maps @uluops/registry-sdk error hierarchy to sanitized MCP tool responses.
 * Strips sensitive information (API keys, tokens, stack traces) before exposure.
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
import type { ZodError } from 'zod';
import type { McpToolResponse } from '../types/index.js';

const MAX_ERROR_MESSAGE_LENGTH = 200;

const SENSITIVE_PATTERNS: RegExp[] = [
  /api[_-]?key/i,
  /apiKey/i,
  /password/i,
  /secret/i,
  /token\s*[:=]\s*\S+/i,
  /bearer\s+\S+/i,
  /authorization:\s*\S+/i,
  /stack\s*trace/i,
  /at\s+\S+\s+\(\S+:\d+:\d+\)/,
  /SQLITE_ERROR/i,
  /ER_\w+/,
  /syntax error.*SQL/i,
  /column\s+['"`]\w+['"`]\s+(?:does not exist|not found)/i,
  /relation\s+['"`]\w+['"`]\s+does not exist/i,
];

export function containsSensitiveData(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

export function sanitizeErrorMessage(message: string): string {
  if (containsSensitiveData(message)) {
    return 'An error occurred while processing your request';
  }
  if (message.length > MAX_ERROR_MESSAGE_LENGTH) {
    return message.slice(0, MAX_ERROR_MESSAGE_LENGTH) + '... (truncated)';
  }
  return message;
}

export function mapSdkErrorToMcp(error: unknown): McpToolResponse {
  let message: string;

  if (isNotFoundError(error)) {
    message = sanitizeErrorMessage((error as Error).message || 'Resource not found');
  } else if (isRateLimitError(error)) {
    message = 'Rate limit exceeded, please retry later';
  } else if (isValidationError(error)) {
    message = sanitizeErrorMessage((error as Error).message || 'Invalid request parameters');
  } else if (error instanceof UnauthorizedError) {
    message = 'Authentication required';
  } else if (error instanceof ForbiddenError) {
    message = 'Access denied';
  } else if (isConflictError(error)) {
    message = sanitizeErrorMessage((error as Error).message || 'Resource conflict');
  } else if (isUnprocessableError(error)) {
    message = sanitizeErrorMessage((error as Error).message || 'Unprocessable request');
  } else if (isRegistryApiError(error)) {
    const rawMessage = (error as Error).message;
    message = containsSensitiveData(rawMessage)
      ? 'An error occurred while processing your request'
      : sanitizeErrorMessage(rawMessage);
  } else if (error instanceof Error) {
    message = sanitizeErrorMessage(error.message);
  } else {
    message = 'An unexpected error occurred';
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: message }),
      },
    ],
    isError: true,
  };
}

export function mapZodErrorToMcp(error: unknown): McpToolResponse {
  let message = 'Invalid input parameters';

  if (error instanceof Error && 'issues' in error) {
    const zodError = error as ZodError<unknown>;
    const details = zodError.issues
      .slice(0, 3)
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    message = `Validation failed: ${details}`;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: message }),
      },
    ],
    isError: true,
  };
}
