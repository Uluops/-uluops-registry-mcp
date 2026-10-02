import { describe, it, expect, vi } from 'vitest';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';
import { registerAllTools } from '../tools/index.js';
import { CROSS_VERSION_CAVEAT, CROSS_VERSION_TOOLS } from '../tools/cross-version-caveat.js';

vi.mock('@uluops/registry-sdk/errors', () => ({
  isRegistryApiError: (): boolean => false,
  isNotFoundError: (): boolean => false,
  isRateLimitError: (): boolean => false,
  isValidationError: (): boolean => false,
  isConflictError: (): boolean => false,
  isUnprocessableError: (): boolean => false,
  UnauthorizedError: class extends Error {},
  ForbiddenError: class extends Error {},
}));

function registeredDescriptions(): Map<string, string> {
  const descriptions = new Map<string, string>();
  const server = {
    tool(name: string, description: string): void {
      descriptions.set(name, description);
    },
  } as unknown as McpServerToolRegistration;
  const client = new Proxy({} as RegistryClient, { get: vi.fn(), apply: vi.fn() });
  registerAllTools(server, client);
  return descriptions;
}

describe('cross-version caveat (dvc spec §4.1, amendment AC)', () => {
  const descriptions = registeredDescriptions();

  it('captures registered descriptions (guards against a vacuous pass)', () => {
    expect(descriptions.size).toBeGreaterThan(CROSS_VERSION_TOOLS.length);
  });

  it.each(CROSS_VERSION_TOOLS)('%s carries the caveat', (name) => {
    const description = descriptions.get(name);
    expect(description, `${name} is not registered`).toBeDefined();
    expect(description).toContain(CROSS_VERSION_CAVEAT);
  });

  it('single-version tools do not carry it', () => {
    expect(descriptions.get('get_effectiveness')).not.toContain(CROSS_VERSION_CAVEAT);
    expect(descriptions.get('get_fork_lineage')).not.toContain(CROSS_VERSION_CAVEAT);
  });
});
