import { describe, it, expect, vi } from 'vitest';
import { mapSdkErrorToMcp, mapZodErrorToMcp } from '../client/sdk-error-mapper.js';
import { ZodError, ZodIssueCode } from 'zod';

// Mock the registry-sdk error type guards and classes
vi.mock('@uluops/registry-sdk/errors', () => {
  class RegistryApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 500) {
      super(message);
      this.name = 'RegistryApiError';
      this.statusCode = statusCode;
    }
  }
  class NotFoundError extends RegistryApiError {
    constructor(message: string) {
      super(message, 404);
      this.name = 'NotFoundError';
    }
  }
  class RateLimitError extends RegistryApiError {
    constructor(message: string) {
      super(message, 429);
      this.name = 'RateLimitError';
    }
  }
  class ValidationError extends RegistryApiError {
    constructor(message: string) {
      super(message, 400);
      this.name = 'ValidationError';
    }
  }
  class ConflictError extends RegistryApiError {
    constructor(message: string) {
      super(message, 409);
      this.name = 'ConflictError';
    }
  }
  class UnprocessableError extends RegistryApiError {
    constructor(message: string) {
      super(message, 422);
      this.name = 'UnprocessableError';
    }
  }

  return {
    UnauthorizedError: class UnauthorizedError extends RegistryApiError {
      constructor(message = 'Unauthorized') {
        super(message, 401);
        this.name = 'UnauthorizedError';
      }
    },
    ForbiddenError: class ForbiddenError extends RegistryApiError {
      constructor(message = 'Forbidden') {
        super(message, 403);
        this.name = 'ForbiddenError';
      }
    },
    isRegistryApiError: (e: unknown) => e instanceof RegistryApiError,
    isNotFoundError: (e: unknown) => e instanceof NotFoundError,
    isRateLimitError: (e: unknown) => e instanceof RateLimitError,
    isValidationError: (e: unknown) => e instanceof ValidationError,
    isConflictError: (e: unknown) => e instanceof ConflictError,
    isUnprocessableError: (e: unknown) => e instanceof UnprocessableError,
    // Re-export classes for test construction
    RegistryApiError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ConflictError,
    UnprocessableError,
  };
});

// Import the mocked classes for constructing test errors
const {
  NotFoundError,
  RateLimitError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  UnprocessableError,
  RegistryApiError,
} = await import('@uluops/registry-sdk/errors');

function parseErrorText(response: { content: { text: string }[] }): string {
  const first = response.content[0];
  if (!first) throw new Error('Expected at least one content entry');
  return JSON.parse(first.text).error as string;
}

describe('mapSdkErrorToMcp', () => {
  it('maps NotFoundError to resource not found message', () => {
    const result = mapSdkErrorToMcp(new NotFoundError('Definition not found'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Definition not found');
  });

  it('sanitizes NotFoundError messages containing sensitive data', () => {
    const result = mapSdkErrorToMcp(
      new NotFoundError('Definition not found at /app/src/index.ts apiKey=sk_live_123')
    );
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('An error occurred while processing your request');
  });

  it('maps RateLimitError to rate limit message', () => {
    const result = mapSdkErrorToMcp(new RateLimitError('Too many requests'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Rate limit exceeded, please retry later');
  });

  it('maps ValidationError with sanitized message', () => {
    const result = mapSdkErrorToMcp(new ValidationError('Name is required'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Name is required');
  });

  it('maps UnauthorizedError to authentication required', () => {
    const result = mapSdkErrorToMcp(new UnauthorizedError());
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Authentication required');
  });

  it('maps ForbiddenError to access denied', () => {
    const result = mapSdkErrorToMcp(new ForbiddenError());
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Access denied');
  });

  it('maps ConflictError with sanitized message', () => {
    const result = mapSdkErrorToMcp(new ConflictError('Already exists'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Already exists');
  });

  it('maps UnprocessableError with sanitized message', () => {
    const result = mapSdkErrorToMcp(new UnprocessableError('Invalid YAML'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Invalid YAML');
  });

  it('maps generic RegistryApiError with sanitized message', () => {
    const result = mapSdkErrorToMcp(new RegistryApiError('Server error'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Server error');
  });

  it('sanitizes RegistryApiError messages containing sensitive data', () => {
    const result = mapSdkErrorToMcp(
      new RegistryApiError('ER_DUP_ENTRY: duplicate key in users table')
    );
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('An error occurred while processing your request');
  });

  it('sanitizes RegistryApiError messages containing SQL errors', () => {
    const result = mapSdkErrorToMcp(
      new RegistryApiError('syntax error near SQL SELECT * FROM secrets')
    );
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('An error occurred while processing your request');
  });

  it('maps generic Error with sanitized message', () => {
    const result = mapSdkErrorToMcp(new Error('Something broke'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Something broke');
  });

  it('maps unknown errors to generic message', () => {
    const result = mapSdkErrorToMcp('string error');
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('An unexpected error occurred');
  });

  it('sanitizes messages containing API keys', () => {
    const result = mapSdkErrorToMcp(new Error('Failed with apiKey=sk_123456'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('An error occurred while processing your request');
  });

  it('sanitizes messages containing bearer tokens', () => {
    const result = mapSdkErrorToMcp(new Error('Bearer abc123def456'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('An error occurred while processing your request');
  });

  it('sanitizes messages containing SQL errors', () => {
    const result = mapSdkErrorToMcp(new Error('ER_DUP_ENTRY: duplicate key'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('An error occurred while processing your request');
  });

  it('sanitizes messages containing stack traces', () => {
    const result = mapSdkErrorToMcp(new Error('at Object.run (/app/src/index.ts:42:10)'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('An error occurred while processing your request');
  });

  it('truncates long error messages', () => {
    const longMessage = 'a'.repeat(300);
    const result = mapSdkErrorToMcp(new Error(longMessage));
    expect(result.isError).toBe(true);
    const text = parseErrorText(result);
    // MAX_ERROR_MESSAGE_LENGTH (200) + '... (truncated)' suffix (16) = 216 max
    expect(text.length).toBeLessThanOrEqual(216);
    expect(text).toContain('... (truncated)');
  });

  it('returns valid MCP response structure', () => {
    const result = mapSdkErrorToMcp(new Error('test'));
    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0]).toHaveProperty('text');
    expect(result.isError).toBe(true);
  });
});

describe('mapZodErrorToMcp', () => {
  it('formats Zod validation errors with paths', () => {
    const zodError = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string, received number',
      },
    ]);
    const result = mapZodErrorToMcp(zodError);
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toContain('name: Expected string');
  });

  it('limits Zod errors to 3 entries', () => {
    const zodError = new ZodError(
      Array.from({ length: 5 }, (_, i) => ({
        code: ZodIssueCode.invalid_type as const,
        expected: 'string' as const,
        received: 'number' as const,
        path: ['field_' + String(i)],
        message: 'Error ' + String(i),
      }))
    );
    const result = mapZodErrorToMcp(zodError);
    const text = parseErrorText(result);
    // Should contain 3 field references but not field_3 or field_4
    expect(text).toContain('field_0');
    expect(text).toContain('field_2');
    expect(text).not.toContain('field_3');
  });

  it('handles non-Error objects gracefully', () => {
    const result = mapZodErrorToMcp('not an error');
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Invalid input parameters');
  });

  it('returns valid MCP response structure', () => {
    const result = mapZodErrorToMcp(new ZodError([]));
    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.isError).toBe(true);
  });
});
