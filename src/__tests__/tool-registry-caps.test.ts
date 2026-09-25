/**
 * Tool-registry size caps must match how mcp-secure-server actually enforces them.
 *
 * Two facts about mcp-secure-server's Layer 4 (read from its source, not assumed):
 *  - `maxEgressBytes` is evaluated at REQUEST time as `argsBytes * 16`
 *    (layer4-semantics.ts, since the 2025-12 TypeScript rewrite). A tool whose
 *    maxEgressBytes < 16 * maxArgsSize therefore has egress/16 as its real argument cap.
 *  - Since 0.0.23, `maxArgsSize` is enforced on every tool (it was skipped for tools
 *    without `argsShape`), measured as UTF-8 bytes of the JSON arguments.
 *
 * Observed 2026-09-24 on 0.8.1: set_default_type("workflow") refused (18 bytes x16 = 288 >
 * 256) while "agent" passed; validate_definition's real cap was ~6.4 KB (100 KB / 16), and
 * create/update/update_and_publish's ~64 KB — an 86 KB ADL could only go through file_path.
 */
import { describe, it, expect, vi } from 'vitest';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';
import { registerAllTools } from '../tools/index.js';
import { toolRegistry } from '../config/tool-registry.js';
import { ENVELOPE_BYTES } from '../config/limits.js';

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

/** Largest `.max()` on any top-level string parameter, from the Zod shape (unwrapping optional). */
function largestStringMax(shape: Record<string, unknown>): number {
  let largest = 0;
  for (const v of Object.values(shape)) {
    let node = v as { _def?: Record<string, unknown> } | undefined;
    for (let i = 0; i < 4 && node?._def?.innerType !== undefined; i++) {
      node = node._def.innerType as typeof node;
    }
    const checks = (node?._def?.checks as Array<{ kind: string; value: number }> | undefined) ?? [];
    if (node?._def?.typeName === 'ZodString') {
      for (const c of checks) if (c.kind === 'max') largest = Math.max(largest, c.value);
    }
  }
  return largest;
}

const shapes = new Map<string, Record<string, unknown>>();
registerAllTools(
  { tool: (name: string, _d: string, shape: Record<string, unknown>) => { shapes.set(name, shape); } } as unknown as McpServerToolRegistration,
  new Proxy({} as RegistryClient, { get: vi.fn() })
);

describe('tool-registry caps vs mcp-secure-server enforcement', () => {
  it('the census is non-empty (the checks can fail)', () => {
    expect(toolRegistry.length).toBeGreaterThan(0);
    expect([...shapes.values()].filter((shape) => largestStringMax(shape) >= 100_000).length).toBeGreaterThan(0);
  });

  it.each(toolRegistry.map((s) => [s.name, s] as const))(
    '%s: maxEgressBytes >= 16 x maxArgsSize (egress never becomes the effective argument cap)',
    (_name, spec) => {
      expect(spec.maxEgressBytes).toBeGreaterThanOrEqual(16 * (spec.maxArgsSize ?? 0));
    }
  );

  it.each(toolRegistry.map((s) => [s.name, s] as const))(
    '%s: maxArgsSize is >= 1 KB (fields headroom) and never above the request envelope',
    (_name, spec) => {
      expect(spec.maxArgsSize ?? 0).toBeGreaterThanOrEqual(1024);
      expect(spec.maxArgsSize ?? 0).toBeLessThanOrEqual(ENVELOPE_BYTES);
    }
  );

  it.each([...shapes.entries()].filter(([, shape]) => largestStringMax(shape) >= 100_000).map(([n]) => n))(
    '%s: carries a large string parameter, so its maxArgsSize is exactly the envelope (the tool gate never binds first)',
    (name) => {
      expect(toolRegistry.find((s) => s.name === name)?.maxArgsSize).toBe(ENVELOPE_BYTES);
    }
  );
});
