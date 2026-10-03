import { describe, it, expect, vi } from 'vitest';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';
import { registerAllTools } from '../tools/index.js';
import {
  CROSS_VERSION_CAVEAT,
  CROSS_VERSION_TOOLS,
  POOLED_VERSIONS_CAVEAT,
  POOLED_VERSIONS_TOOLS,
} from '../tools/cross-version-caveat.js';

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

type Handler = (args: unknown) => Promise<{ content: { type: string; text: string }[] }>;

function registered(): { descriptions: Map<string, string>; handlers: Map<string, Handler> } {
  const descriptions = new Map<string, string>();
  const handlers = new Map<string, Handler>();
  const server = {
    tool(name: string, description: string, _shape: unknown, handler: Handler): void {
      descriptions.set(name, description);
      handlers.set(name, handler);
    },
  } as unknown as McpServerToolRegistration;
  // Every SDK method resolves to an empty object, so each handler reaches its success path.
  const method = (): Promise<object> => Promise.resolve({});
  const namespace = new Proxy({}, { get: () => method });
  const client = new Proxy({} as RegistryClient, { get: () => namespace });
  registerAllTools(server, client);
  return { descriptions, handlers };
}

// Pinned here, independently of the arrays under test: removing a tool from
// CROSS_VERSION_TOOLS or POOLED_VERSIONS_TOOLS must fail this file (A31 TA-3 — the
// 0.11.1 test iterated the array it was checking, so shrinking it passed).
const EXPECTED_CROSS = ['compare_effectiveness', 'get_diff_impact', 'get_evolution', 'get_lineage', 'get_translation_analytics'];
const EXPECTED_POOLED = ['get_effectiveness', 'get_health'];

function handlerFor(handlers: Map<string, Handler>, name: string): Handler {
  const handler = handlers.get(name);
  if (handler === undefined) throw new Error(`${name} is not registered`);
  return handler;
}

describe('cross-version caveats (dvc spec \u00a74.1, amendments AC and AH)', () => {
  const { descriptions, handlers } = registered();

  it('the tool lists match the pinned sets', () => {
    expect([...CROSS_VERSION_TOOLS].sort()).toEqual(EXPECTED_CROSS);
    expect([...POOLED_VERSIONS_TOOLS].sort()).toEqual(EXPECTED_POOLED);
  });

  it.each(EXPECTED_CROSS)('%s carries the cross-version caveat in description and response', async (name) => {
    expect(descriptions.get(name), `${name} is not registered`).toContain(CROSS_VERSION_CAVEAT);
    const response = await handlerFor(handlers, name)({ type: 'agent', name: 'x', version: '1.0.0', versions: ['1.0.0', '1.1.0'], from_version: '1.0.0', to_version: '1.1.0' });
    expect(response.content.map((c) => c.text)).toContain(JSON.stringify({ caveat: CROSS_VERSION_CAVEAT }));
  });

  it.each(EXPECTED_POOLED)('%s carries the pooled-versions caveat in description and response', async (name) => {
    expect(descriptions.get(name), `${name} is not registered`).toContain(POOLED_VERSIONS_CAVEAT);
    const response = await handlerFor(handlers, name)({ type: 'agent', name: 'x', version: '1.0.0' });
    expect(response.content.map((c) => c.text)).toContain(JSON.stringify({ caveat: POOLED_VERSIONS_CAVEAT }));
  });

  it('tools outside both sets carry neither caveat', () => {
    const covered = new Set([...EXPECTED_CROSS, ...EXPECTED_POOLED]);
    const others = [...descriptions].filter(([name]) => !covered.has(name));
    // Guards against a vacuous pass: registerAllTools must have registered the rest of the server's tools,
    // so the loop below actually checks something. The server registers ~45; 10 is a floor, not a count.
    expect(others.length).toBeGreaterThan(10);
    for (const [name, description] of others) {
      expect(description, name).not.toContain(CROSS_VERSION_CAVEAT);
      expect(description, name).not.toContain(POOLED_VERSIONS_CAVEAT);
    }
  });

  it('pins the shared sentence word for word (the same literal is pinned in @uluops/ops-mcp)', () => {
    expect(CROSS_VERSION_CAVEAT).toBe(
    'Cross-version figures here are observational. Some are not per-version at all: health, failure-domain and ' +
    'taxonomy figures, where present, pool every version of the definition and are re-stamped onto a version whenever ' +
    'it is recomputed, so a difference between versions there only reflects when each was recomputed. Pass rates and ' +
    'scores, where per-version, come from each version\'s own runs in its own period, on its own artifacts, and are the ' +
    'agent\'s own assessments of those artifacts, so an edit that changes how lenient it is moves them without changing ' +
    'quality. No difference between versions here is evidence that an edit made the definition better or worse; do not ' +
    'rank versions or recommend one on the basis of these figures, alone or combined with other figures.',
    );
    expect(CROSS_VERSION_CAVEAT).not.toMatch(/\bgrades?\b/);
  });

  it('the wording does not license ranking with a second source', () => {
    expect(CROSS_VERSION_CAVEAT).not.toMatch(/figures alone\./);
    expect(CROSS_VERSION_CAVEAT).toContain('alone or combined with other figures');
  });
});
