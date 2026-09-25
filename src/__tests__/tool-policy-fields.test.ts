/**
 * tool-policies.json <-> tool input-schema parity (ported from @uluops/ops-mcp 0.22.1).
 *
 * The file ships in `files` but was never passed to SecureMcpServer as `toolPoliciesPath`, so
 * mcp-secure-server's default lookup (TOOL_POLICIES_PATH env -> <cwd>/tool-policies.json ->
 * ~/.config) never found it under an MCP host whose cwd is the user's project: none of its
 * relaxations had ever been in effect. Before loading it, bind it to the input shapes so a
 * stale entry cannot silently relax nothing, or name a tool that does not exist.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';
import { registerAllTools } from '../tools/index.js';

vi.mock('@uluops/registry-sdk/errors', () => ({
  isRegistryApiError: (): boolean => false, isNotFoundError: (): boolean => false,
  isRateLimitError: (): boolean => false, isValidationError: (): boolean => false,
  isConflictError: (): boolean => false, isUnprocessableError: (): boolean => false,
  UnauthorizedError: class extends Error {}, ForbiddenError: class extends Error {},
}));

type Policy = { level?: string; relaxedFields?: string[] };
const policies = (JSON.parse(
  readFileSync(fileURLToPath(new URL('../../tool-policies.json', import.meta.url)), 'utf8')
) as { tools: Record<string, Policy> }).tools;

function collectKeys(node: unknown, out: Set<string>, seen = new Set<unknown>()): void {
  if (node === null || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  const n = node as Record<string, unknown> & { _def?: Record<string, unknown> };
  const shapeSrc = (n as { shape?: unknown }).shape ?? n._def?.shape;
  const shape: unknown = typeof shapeSrc === 'function' ? (shapeSrc as () => unknown)() : shapeSrc;
  if (shape !== null && typeof shape === 'object') {
    for (const [k, v] of Object.entries(shape as Record<string, unknown>)) { out.add(k); collectKeys(v, out, seen); }
  }
  const def = n._def ?? {};
  for (const inner of [def.innerType, def.schema, def.type, def.element, def.valueType]) collectKeys(inner, out, seen);
  for (const opt of (def.options as unknown[] | undefined) ?? []) collectKeys(opt, out, seen);
}

const inputFields = new Map<string, Set<string>>();
registerAllTools(
  {
    tool: (name: string, _d: string, shape: Record<string, unknown> | undefined) => {
      const keys = new Set<string>();
      for (const [k, v] of Object.entries(shape ?? {})) { keys.add(k); collectKeys(v, keys); }
      inputFields.set(name, keys);
    },
  } as unknown as McpServerToolRegistration,
  new Proxy({} as RegistryClient, { get: vi.fn() })
);

describe('tool-policies.json relaxedFields <-> input schemas', () => {
  it('the census is non-empty (the checks can fail)', () => {
    expect(inputFields.size).toBeGreaterThan(0);
    expect(Object.values(policies).filter((p) => (p.relaxedFields?.length ?? 0) > 0).length).toBeGreaterThan(0);
  });

  it('every policy names a registered tool', () => {
    const unknown = Object.keys(policies).filter((t) => !inputFields.has(t));
    expect(unknown, `policies for tools that are not registered: ${unknown.join(', ')}`).toEqual([]);
  });

  it('every relaxedFields entry names a field its tool accepts (at any depth)', () => {
    const stale: string[] = [];
    for (const [tool, policy] of Object.entries(policies)) {
      const accepted = inputFields.get(tool);
      if (!accepted) continue;
      for (const f of policy.relaxedFields ?? []) if (!accepted.has(f)) stale.push(`${tool}.${f}`);
    }
    expect(stale, `relaxedFields naming fields the tool does not accept: ${stale.join(', ')}`).toEqual([]);
  });

  it('every tool that accepts a yaml parameter relaxes it', () => {
    const missing = [...inputFields.entries()]
      .filter(([, f]) => f.has('yaml'))
      .map(([t]) => t)
      .filter((t) => !(policies[t]?.relaxedFields ?? []).includes('yaml'));
    expect(missing, `yaml-accepting tools that scan yaml as content: ${missing.join(', ')}`).toEqual([]);
  });
});
