import { describe, it, expect, vi } from 'vitest';
import { mapSdkErrorToMcp, mapZodErrorToMcp, sanitizeErrorMessage } from '../client/sdk-error-mapper.js';
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
    retryAfter?: number;
    constructor(message: string, retryAfter?: number) {
      super(message, 429);
      this.name = 'RateLimitError';
      this.retryAfter = retryAfter;
    }
  }
  class ValidationError extends RegistryApiError {
    constructor(message: string) {
      super(message, 400);
      this.name = 'ValidationError';
    }
  }
  class ConflictError extends RegistryApiError {
    details?: Record<string, unknown>;
    constructor(message: string, details?: Record<string, unknown>) {
      super(message, 409);
      this.name = 'ConflictError';
      this.details = details;
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
    isRegistryApiError: vi.fn((e: unknown): boolean => e instanceof RegistryApiError),
    isNotFoundError: vi.fn((e: unknown): boolean => e instanceof NotFoundError),
    isRateLimitError: (e: unknown): boolean => e instanceof RateLimitError,
    isValidationError: (e: unknown): boolean => e instanceof ValidationError,
    isConflictError: (e: unknown): boolean => e instanceof ConflictError,
    isUnprocessableError: (e: unknown): boolean => e instanceof UnprocessableError,
    RegistryApiError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ConflictError,
    UnprocessableError,
  };
});

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

function parseErrorPayload(response: { content: { text: string }[] }): Record<string, unknown> {
  const first = response.content[0];
  if (!first) throw new Error('Expected at least one content entry');
  return JSON.parse(first.text) as Record<string, unknown>;
}

describe('mapSdkErrorToMcp', () => {
  it('maps NotFoundError preserving message', () => {
    const result = mapSdkErrorToMcp(new NotFoundError('Definition not found'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Definition not found');
  });

  it('redacts actual credential values in NotFoundError', () => {
    const result = mapSdkErrorToMcp(
      new NotFoundError('Definition not found with apiKey=sk_live_123')
    );
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toContain('[REDACTED]');
    expect(parseErrorText(result)).not.toContain('sk_live_123');
  });

  it('maps RateLimitError with retry info', () => {
    const result = mapSdkErrorToMcp(new RateLimitError('Too many requests'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toContain('Rate limit exceeded');
    expect(parseErrorPayload(result).status).toBe(429);
  });

  it('maps RateLimitError with retryAfter seconds', () => {
    const error = new RateLimitError('Too many', 60);
    const result = mapSdkErrorToMcp(error);
    expect(parseErrorText(result)).toContain('60 seconds');
    expect(parseErrorPayload(result).retry_after_seconds).toBe(60);
  });

  it('maps ValidationError preserving message', () => {
    const result = mapSdkErrorToMcp(new ValidationError('Name is required'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Name is required');
  });

  it('maps UnauthorizedError to actionable auth message', () => {
    const result = mapSdkErrorToMcp(new UnauthorizedError());
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toContain('ULUOPS_API_KEY');
    expect(parseErrorPayload(result).status).toBe(401);
  });

  it('maps ForbiddenError preserving original message', () => {
    const result = mapSdkErrorToMcp(new ForbiddenError('Insufficient permissions'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Insufficient permissions');
    const payload = parseErrorPayload(result);
    expect(payload.status).toBe(403);
    expect(payload).not.toHaveProperty('required_role');
    // RG5 envelope parity: every error now carries the generic type-keyed
    // suggestion (and error_type) — role-specific guidance still only on
    // role denials, asserted in the R16 test below.
    expect(payload.error_type).toBe('ForbiddenError');
    expect(payload.suggestion).toContain('Access denied');
  });

  it('adds role guidance to role-gate 403s (R16)', () => {
    const result = mapSdkErrorToMcp(new ForbiddenError('Requires admin role'));
    const payload = parseErrorPayload(result);
    expect(payload.status).toBe(403);
    expect(payload.required_role).toBe('admin');
    expect(String(payload.suggestion)).toContain('UluOps runtime');
  });

  it('role denials branch on the API code, not only the message (RG5)', () => {
    // sdk-core >=0.17 retains the 403 code — an INSUFFICIENT_ROLE denial gets
    // role guidance even when the message is not the platform's terse copy.
    const error = new ForbiddenError('Publishing is restricted for this definition.');
    Object.assign(error as unknown as Record<string, unknown>, { code: 'INSUFFICIENT_ROLE' });
    const payload = parseErrorPayload(mapSdkErrorToMcp(error));
    expect(payload.status).toBe(403);
    expect(payload.code).toBe('INSUFFICIENT_ROLE');
    expect(String(payload.suggestion)).toContain('UluOps runtime');
  });

  it('INSUFFICIENT_SCOPE 403 names the scope fix, not the id/org audit (RG5/T20)', () => {
    const error = new ForbiddenError('This API key is read-only. Use a key with write scope.');
    Object.assign(error as unknown as Record<string, unknown>, { code: 'INSUFFICIENT_SCOPE' });
    const payload = parseErrorPayload(mapSdkErrorToMcp(error, 'publish_definition'));
    expect(payload.status).toBe(403);
    expect(payload.tool).toBe('publish_definition');
    const suggestion = String(payload.suggestion);
    expect(suggestion).toContain('--scope write');
    expect(suggestion.toLowerCase()).not.toContain('verify the id');
  });

  it('envelope parity: error_type, tool, and suggestion on every branch (RG5)', () => {
    const notFound = mapSdkErrorToMcp(new NotFoundError("Definition 'agent/nope' not found"), 'get_definition');
    const payload = parseErrorPayload(notFound);
    expect(payload.error_type).toBe('NotFoundError');
    expect(payload.tool).toBe('get_definition');
    // 404 remedy names the discovery tool for the resource (tracker T7 pattern).
    expect(String(payload.suggestion)).toContain('list_definitions');

    const generic = parseErrorPayload(mapSdkErrorToMcp(new Error('boom'), 'get_health'));
    expect(generic.error_type).toBe('Error');
    expect(generic.tool).toBe('get_health');
  });

  it('404 discovery keying picks the resource-specific tool (RG5)', () => {
    const model = parseErrorPayload(mapSdkErrorToMcp(new NotFoundError("Model 'claude-9' not found")));
    expect(String(model.suggestion)).toContain('list_models');
    const alias = parseErrorPayload(mapSdkErrorToMcp(new NotFoundError("Alias 'opus' not found")));
    expect(String(alias.suggestion)).toContain('list_aliases');
    // Unrecognized resource falls back to the generic discovery remedy.
    const other = parseErrorPayload(mapSdkErrorToMcp(new NotFoundError('Widget not found')));
    expect(String(other.suggestion)).toContain('list or search tool');
  });

  it('maps ConflictError preserving message', () => {
    const result = mapSdkErrorToMcp(new ConflictError('Already exists'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Already exists');
  });

  it('forwards nextAvailable from ConflictError details', () => {
    const result = mapSdkErrorToMcp(new ConflictError('Already exists', { nextAvailable: '1.0.3' }));
    const payload = parseErrorPayload(result);
    expect(payload.nextAvailable).toBe('1.0.3');
    expect(payload.status).toBe(409);
  });

  it('maps UnprocessableError preserving message', () => {
    const result = mapSdkErrorToMcp(new UnprocessableError('Invalid YAML'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Invalid YAML');
  });

  it('maps generic RegistryApiError preserving safe message', () => {
    const result = mapSdkErrorToMcp(new RegistryApiError('Server error'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Server error');
  });

  it('redacts credentials in RegistryApiError messages', () => {
    const result = mapSdkErrorToMcp(
      new RegistryApiError('Failed with apiKey=sk_live_secret')
    );
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toContain('[REDACTED]');
    expect(parseErrorText(result)).not.toContain('sk_live_secret');
  });

  it('preserves error messages that merely mention field names', () => {
    // "password" as a field name reference, not a credential value
    const result = mapSdkErrorToMcp(new Error('password field is required'));
    expect(parseErrorText(result)).toBe('password field is required');
  });

  it('maps generic Error preserving message', () => {
    const result = mapSdkErrorToMcp(new Error('Something broke'));
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('Something broke');
  });

  it('maps unknown errors to generic message', () => {
    const result = mapSdkErrorToMcp('string error');
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('An unexpected error occurred');
  });

  it('extracts message from non-Error object with message property', async () => {
    const { isNotFoundError } = await import('@uluops/registry-sdk/errors');
    vi.mocked(isNotFoundError).mockReturnValueOnce(true);

    const plainObj = { message: 'object with message', statusCode: 404 };
    const result = mapSdkErrorToMcp(plainObj);
    expect(result.isError).toBe(true);
    expect(parseErrorText(result)).toBe('object with message');
  });

  it('redacts actual API key values', () => {
    const result = mapSdkErrorToMcp(new Error('Failed with apiKey=sk_123456'));
    expect(parseErrorText(result)).toContain('[REDACTED]');
    expect(parseErrorText(result)).not.toContain('sk_123456');
  });

  it('redacts bearer tokens', () => {
    const result = mapSdkErrorToMcp(new Error('Auth: Bearer abc123def456'));
    expect(parseErrorText(result)).toContain('[REDACTED]');
    expect(parseErrorText(result)).not.toContain('abc123def');
  });

  it('redacts stack traces', () => {
    const result = mapSdkErrorToMcp(new Error('at Object.run (/app/src/index.ts:42:10)'));
    expect(parseErrorText(result)).toContain('[REDACTED]');
  });

  it('truncates long error messages at 1000 chars', () => {
    const longMessage = 'a'.repeat(1200);
    const result = mapSdkErrorToMcp(new Error(longMessage));
    const text = parseErrorText(result);
    expect(text.length).toBeLessThan(1100);
    expect(text).toContain('... (truncated)');
  });

  it('includes status codes in error payload', () => {
    const result = mapSdkErrorToMcp(new RegistryApiError('Server error', 500));
    expect(parseErrorPayload(result).status).toBe(500);
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

describe('sanitizeErrorMessage', () => {
  it.each([
    ['api_key=abc123', 'actual key assignment'],
    ['apiKey: sk_live_xyz', 'actual key assignment'],
    ['token = abc123def', 'token assignment'],
    ['Bearer eyJhbGciOiJIUzI1NiJ9', 'bearer token'],
    ['authorization: Basic dXNlcjpwYXNz', 'authorization header'],
    ['at Object.run (/app/src/index.ts:42:10)', 'stack frame'],
  ])('redacts credential pattern: %s (%s)', (input) => {
    const result = sanitizeErrorMessage(input);
    expect(result).toContain('[REDACTED]');
  });

  it.each([
    'Definition not found',
    'Name is required',
    'Invalid YAML format',
    'Version 1.0.0 already exists',
    'password field is required',
    'Client secret is invalid',
    'Invalid apiKey format',
  ])('preserves safe message: %s', (input) => {
    expect(sanitizeErrorMessage(input)).toBe(input);
  });

  it('truncates messages longer than 1000 characters', () => {
    const longMessage = 'a'.repeat(1200);
    const result = sanitizeErrorMessage(longMessage);
    expect(result).toContain('... (truncated)');
    expect(result.length).toBeLessThan(1100);
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
    expect(parseErrorText(result)).toContain('1 error');
  });

  it('shows ALL Zod errors, not just first 3', () => {
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
    expect(text).toContain('5 errors');
    expect(text).toContain('field_0');
    expect(text).toContain('field_4');
  });

  it('includes status 400 in Zod error payload', () => {
    const zodError = new ZodError([
      { code: ZodIssueCode.invalid_type, expected: 'string', received: 'number', path: ['x'], message: 'bad' },
    ]);
    const result = mapZodErrorToMcp(zodError);
    expect(parseErrorPayload(result).status).toBe(400);
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
