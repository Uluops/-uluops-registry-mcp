import { describe, it, expect, vi } from 'vitest';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';
import { registerAllTools } from '../tools/index.js';
import {
  CROSS_VERSION_CAVEAT,
  CROSS_VERSION_TOOLS,
  POOLED_VERSIONS_CAVEAT,
  POOLED_VERSIONS_TOOLS,
  UNVERSIONED_FIGURES_CAVEAT,
  UNVERSIONED_FIGURES_TOOLS,
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
const EXPECTED_UNVERSIONED = ['get_ecosystem_overview', 'get_execution_stats'];

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
    expect([...UNVERSIONED_FIGURES_TOOLS].sort()).toEqual(EXPECTED_UNVERSIONED);
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

  it.each(EXPECTED_UNVERSIONED)('%s carries the unversioned-figures caveat in description and response (CM, P0m-3)', async (name) => {
    expect(descriptions.get(name), `${name} is not registered`).toContain(UNVERSIONED_FIGURES_CAVEAT);
    const response = await handlerFor(handlers, name)({ type: 'agent', name: 'x', version: '1.0.0' });
    expect(response.content.map((c) => c.text)).toContain(JSON.stringify({ caveat: UNVERSIONED_FIGURES_CAVEAT }));
  });

  it('each set\'s tools carry only their own caveat', () => {
    const sets: Array<[readonly string[], string]> = [
      [EXPECTED_CROSS, CROSS_VERSION_CAVEAT], [EXPECTED_POOLED, POOLED_VERSIONS_CAVEAT], [EXPECTED_UNVERSIONED, UNVERSIONED_FIGURES_CAVEAT],
    ];
    for (const [names, own] of sets) {
      for (const name of names) {
        for (const [, other] of sets) if (other !== own) expect(descriptions.get(name), name).not.toContain(other);
      }
    }
  });

  it('tools outside every set carry no caveat', () => {
    const covered = new Set([...EXPECTED_CROSS, ...EXPECTED_POOLED, ...EXPECTED_UNVERSIONED]);
    const others = [...descriptions].filter(([name]) => !covered.has(name));
    // Guards against a vacuous pass: registerAllTools must have registered the rest of the server's tools,
    // so the loop below actually checks something. The server registers ~45; 10 is a floor, not a count.
    expect(others.length).toBeGreaterThan(10);
    for (const [name, description] of others) {
      expect(description, name).not.toContain(CROSS_VERSION_CAVEAT);
      expect(description, name).not.toContain(POOLED_VERSIONS_CAVEAT);
      expect(description, name).not.toContain(UNVERSIONED_FIGURES_CAVEAT);
    }
  });

  it('pins the shared sentence word for word (the same literal is pinned in @uluops/ops-mcp)', () => {
    expect(CROSS_VERSION_CAVEAT).toBe(
      'Cross-version figures here are observational. Some may not be per-version at all: health, failure-domain, ' +
      'taxonomy and execution-count figures, where present, may be computed for the definition rather than the ' +
      'version they are shown under (pooling its runs across versions, and possibly across orgs, or taking ' +
      'issue-derived parts from a single version that need not be the one shown) and are stored against a version ' +
      'whenever it is recomputed, so a difference between versions there can reflect when and how each was recomputed ' +
      'rather than the versions. Pass rates and scores, where per-version, come from each version\'s own runs in its ' +
      'own period, on its own artifacts, and are the agent\'s own assessments of those artifacts, so an edit that ' +
      'changes how lenient it is moves them without changing quality. No difference between versions here is evidence ' +
      'that an edit made the definition better or worse; do not rank versions or recommend one on the basis of these ' +
      'figures, alone or combined with other figures.',
    );
    expect(CROSS_VERSION_CAVEAT).not.toMatch(/\bgrades?\b/);
  });

  it('pins the pooled-versions sentence word for word (A35, amendment AS)', () => {
    expect(POOLED_VERSIONS_CAVEAT).toBe(
      'These figures are not specific to the requested version: run-based figures pool every version of the ' +
      'definition run in the window (possibly across orgs), and issue-derived figures (false-positive, declined and ' +
      'resolution rates, taxonomy, and the parts of health built from them) may come from a single version that need ' +
      'not be the one requested. They cannot show whether one version differs from another. Do not compare these ' +
      'figures across versions, and do not report them as the requested version\'s.',
    );
  });

  it('pins the unversioned-figures sentence word for word (the same literal is pinned in @uluops/ops-mcp)', () => {
    expect(UNVERSIONED_FIGURES_CAVEAT).toBe(
      'Figures here are not evidence about any one version, including those shown with a version: the response does ' +
      'not show that the version was checked against the registry, and it may have been filled in by the server. Each ' +
      'may pool every version of the agent or definition it describes (some also span several definitions or orgs), ' +
      'even when the request named a version, or may come from a single version. Do not attribute such a figure to a ' +
      'version, compare it with a version\'s own figures, recommend a definition\'s current version on the basis of it, ' +
      'or read a change in it as evidence that an edit made a definition better or worse.',
    );
    // CL: a version on the wire is not identity, so the caveat may not exempt figures by whether one is present
    // (the first wording did; perverse-outcome P1, review 2026-10-08).
    expect(UNVERSIONED_FIGURES_CAVEAT).not.toMatch(/(that|which) carry no (definition )?version/i);
    expect(UNVERSIONED_FIGURES_CAVEAT).toContain('including those shown with a version');
  });

  it('the wording does not license ranking with a second source', () => {
    expect(CROSS_VERSION_CAVEAT).not.toMatch(/figures alone\./);
    expect(CROSS_VERSION_CAVEAT).toContain('alone or combined with other figures');
  });
});
