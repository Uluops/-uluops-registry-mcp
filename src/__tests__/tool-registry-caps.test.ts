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
import { z } from 'zod';
import { describe, it, expect, vi } from 'vitest';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';
import { registerAllTools } from '../tools/index.js';
import { toolRegistry } from '../config/tool-registry.js';
import { ENVELOPE_BYTES } from '../config/limits.js';
import { toolInteger } from '../utils/tool-integer.js';

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

/**
 * Largest `.max()` on any top-level string parameter, from the Zod shape (unwrapping
 * optional/nullable/default). zod 4: wrappers keep the inner schema at `_zod.def.innerType`, and a
 * string exposes its cap as the public `maxLength` (zod 3 read `_def.typeName` and `_def.checks`).
 */
function largestStringMax(shape: Record<string, unknown>): number {
  let largest = 0;
  for (const v of Object.values(shape)) {
    let node = v as z.ZodType | undefined;
    for (let i = 0; i < 4 && node !== undefined; i++) {
      const inner = (node as unknown as { _zod: { def: { innerType?: z.ZodType } } })._zod.def.innerType;
      if (inner === undefined) break;
      node = inner;
    }
    if (node instanceof z.ZodString && node.maxLength !== null) largest = Math.max(largest, node.maxLength);
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

/**
 * No tool advertises zod 4's safe-integer bound (`maximum: 9007199254740991`): integer params keep
 * the 0.16.x wire, `{ "type": "integer" }` (utils/tool-integer.ts). Converted with zod 4's
 * `toJSONSchema`, the converter the MCP SDK uses for zod 4 schemas.
 */
describe('tool integer wire schema', () => {
  const SAFE = String(Number.MAX_SAFE_INTEGER);
  const wire = (shape: Record<string, unknown>): string =>
    JSON.stringify(z.toJSONSchema(z.object(shape as Record<string, z.ZodType>), { io: 'input' }));

  it('no tool advertises the safe-integer bound', () => {
    expect(shapes.size).toBe(44);
    expect([...shapes].filter(([, shape]) => wire(shape).includes(SAFE)).map(([name]) => name)).toEqual([]);
  });

  it('toolInteger() is advertised as a plain integer and validates as one', () => {
    expect(JSON.parse(wire({ n: toolInteger().positive() })).properties.n).toEqual({ type: 'integer', exclusiveMinimum: 0 });
    expect(toolInteger().safeParse(3).success).toBe(true);
    expect(toolInteger().safeParse(1.5).success).toBe(false);
    expect(toolInteger().safeParse('3').success).toBe(false);
  });

  it('control: bare z.number().int() does advertise the bound', () => {
    expect(wire({ n: z.number().int() })).toContain(SAFE);
  });
});
