/**
 * Tool schemas refuse what the registry API refuses, by field name (config/api-limits.ts),
 * and the largest request the API accepts still fits the transport envelope.
 *
 * Every cap is checked at the API's value (accepted) and one over it (refused), so a cap
 * that drifted in either direction fails here.
 */
import { describe, it, expect } from 'vitest';
import { SecureMcpServer } from 'mcp-secure-server';
import { buildServerOptions } from '../config/server-options.js';
import {
  API_YAML_MAX_CHARS, API_DESCRIPTION_MAX_CHARS, API_TAGS_MAX_ITEMS, API_TAG_MAX_CHARS,
  API_DEPRECATION_REASON_MAX_CHARS, API_DEFINITION_NAME_MAX_CHARS, API_EXECUTION_SOURCE_MAX_CHARS,
  API_RUN_ID_MAX_CHARS, YAML_TOO_LONG_MESSAGE, API_YAML_PUBLISH_MAX_BYTES,
} from '../config/api-limits.js';
import { ENVELOPE_BYTES, API_DEFINITION_BODY_LIMIT_BYTES } from '../config/limits.js';
import { ValidateDefinitionInputSchema } from '../tools/validate-definition.js';
import { CreateDefinitionInputSchema } from '../tools/create-definition.js';
import { UpdateDefinitionInputSchema } from '../tools/update-definition.js';
import { UpdateAndPublishInputSchema } from '../tools/update-and-publish.js';
import { UpgradeDefinitionInputSchema } from '../tools/upgrade-definition.js';
import { DeprecateDefinitionInputSchema } from '../tools/deprecate-definition.js';
import { ForkDefinitionInputSchema } from '../tools/fork-definition.js';
import { RecordExecutionInputSchema } from '../tools/record-execution.js';

const s = (n: number, ch = 'a'): string => ch.repeat(n);

describe('YAML: the API cap (153,600 chars) on every yaml-bearing tool', () => {
  type Parse = (yaml: string) => { success: boolean; error?: { issues: unknown[] } };
  const schemas: Record<string, Parse> = {
    validate_definition: (yaml) => ValidateDefinitionInputSchema.safeParse({ yaml }),
    create_definition: (yaml) => CreateDefinitionInputSchema.safeParse({ name: 'x', yaml }),
    update_definition: (yaml) => UpdateDefinitionInputSchema.safeParse({ name: 'x', version: '1.0.0', yaml }),
    update_and_publish: (yaml) => UpdateAndPublishInputSchema.safeParse({ name: 'x', version: '1.0.0', yaml }),
    upgrade_definition: (yaml) => UpgradeDefinitionInputSchema.safeParse({ name: 'x', yaml }),
  };
  for (const [tool, parse] of Object.entries(schemas)) {
    it(`${tool}: accepts ${String(API_YAML_MAX_CHARS)}, refuses one more with the API's message`, () => {
      expect(parse(s(API_YAML_MAX_CHARS)).success).toBe(true);
      const over = parse(s(API_YAML_MAX_CHARS + 1));
      expect(over.success).toBe(false);
      expect(JSON.stringify(over.error?.issues)).toContain(YAML_TOO_LONG_MESSAGE);
    });
  }
});

describe('other fields: the API caps', () => {
  const base = { name: 'x', version: '1.0.0' };
  const cases: Array<[string, (v: unknown) => boolean, unknown, unknown]> = [
    ['update description', (v): boolean => UpdateDefinitionInputSchema.safeParse({ ...base, description: v }).success, s(API_DESCRIPTION_MAX_CHARS), s(API_DESCRIPTION_MAX_CHARS + 1)],
    ['update tags (count)', (v): boolean => UpdateDefinitionInputSchema.safeParse({ ...base, tags: v }).success, Array(API_TAGS_MAX_ITEMS).fill('t'), Array(API_TAGS_MAX_ITEMS + 1).fill('t')],
    ['update tags (length)', (v): boolean => UpdateDefinitionInputSchema.safeParse({ ...base, tags: v }).success, [s(API_TAG_MAX_CHARS)], [s(API_TAG_MAX_CHARS + 1)]],
    ['update_and_publish description', (v): boolean => UpdateAndPublishInputSchema.safeParse({ ...base, description: v }).success, s(API_DESCRIPTION_MAX_CHARS), s(API_DESCRIPTION_MAX_CHARS + 1)],
    ['deprecate reason', (v): boolean => DeprecateDefinitionInputSchema.safeParse({ ...base, reason: v }).success, s(API_DEPRECATION_REASON_MAX_CHARS), s(API_DEPRECATION_REASON_MAX_CHARS + 1)],
    ['deprecate successor', (v): boolean => DeprecateDefinitionInputSchema.safeParse({ ...base, reason: 'r', successor: v }).success, 'new-agent@2.0.0', 'New Agent'],
    ['fork new_name (length)', (v): boolean => ForkDefinitionInputSchema.safeParse({ ...base, new_name: v }).success, s(API_DEFINITION_NAME_MAX_CHARS), s(API_DEFINITION_NAME_MAX_CHARS + 1)],
    ['fork new_name (pattern)', (v): boolean => ForkDefinitionInputSchema.safeParse({ ...base, new_name: v }).success, 'my-fork-2', 'My_Fork'],
    ['record_execution source', (v): boolean => RecordExecutionInputSchema.safeParse({ ...base, source: v }).success, s(API_EXECUTION_SOURCE_MAX_CHARS), s(API_EXECUTION_SOURCE_MAX_CHARS + 1)],
    ['record_execution run_id', (v): boolean => RecordExecutionInputSchema.safeParse({ ...base, run_id: v }).success, s(API_RUN_ID_MAX_CHARS), s(API_RUN_ID_MAX_CHARS + 1)],
  ];
  it.each(cases)('%s: accepts the API limit, refuses past it', (_name, parse, ok, over) => {
    expect(parse(ok)).toBe(true);
    expect(parse(over)).toBe(false);
  });
});

/**
 * A pipeline built from the production options, validating as mcp-secure-server's transport
 * does: it passes `policy: defaultPolicy` in the pipeline context, without which Layer 4
 * refuses every write tool.
 */
type Validate = (message: Record<string, unknown>) => ReturnType<SecureMcpServer['validationPipeline']['validate']>;
async function pipeline(): Promise<Validate> {
  const options = buildServerOptions({ enableLogging: false, verboseLogging: false, logPerformanceMetrics: false });
  const server = await SecureMcpServer.create({ name: 'api-limits-test', version: '0.0.0' }, options);
  return (message: Record<string, unknown>) =>
    server.validationPipeline.validate(message, { timestamp: Date.now(), transportLevel: true, originalMessage: message, policy: options?.defaultPolicy });
}
const call = (yaml: string): Record<string, unknown> => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'validate_definition', arguments: { yaml } } });

const CJK = '设计评审记录了所有的问题和建议';

/** A string of exactly `n` CJK characters: 3 UTF-8 bytes each, the most a UTF-16 code unit can cost. */
const cjk = (n: number): string => CJK.repeat(Math.ceil(n / CJK.length)).slice(0, n);

/** YAML of exactly `chars` characters, all CJK after a short header. */
function cjkYaml(chars: number): string {
  const head = 'agent:\n  notes: ';
  return head + cjk(chars - head.length);
}

describe('YAML in two units: characters everywhere, UTF-8 bytes on update_and_publish', () => {
  const uap = (yaml: string): ReturnType<typeof UpdateAndPublishInputSchema.safeParse> =>
    UpdateAndPublishInputSchema.safeParse({ name: 'x', version: '1.0.0', yaml });

  it('update_and_publish accepts CJK YAML at exactly 153,600 bytes and refuses one character more', () => {
    const atLimit = cjk(API_YAML_PUBLISH_MAX_BYTES / 3);
    expect(Buffer.byteLength(atLimit, 'utf8')).toBe(API_YAML_PUBLISH_MAX_BYTES);
    expect(uap(atLimit).success).toBe(true);
    const over = uap(cjk(API_YAML_PUBLISH_MAX_BYTES / 3 + 1));
    expect(over.success).toBe(false);
    expect(JSON.stringify(over.error?.issues)).toContain('153603 UTF-8 bytes');
  });

  it('update_and_publish accepts ASCII YAML at the character limit (both limits coincide for ASCII)', () => {
    expect(uap(s(API_YAML_MAX_CHARS)).success).toBe(true);
  });

  it('draft tools take CJK YAML over the byte limit, as the API does', () => {
    const overBytes = cjk(API_YAML_PUBLISH_MAX_BYTES / 3 + 1);
    expect(CreateDefinitionInputSchema.safeParse({ name: 'x', yaml: overBytes }).success).toBe(true);
    expect(UpdateDefinitionInputSchema.safeParse({ name: 'x', version: '1.0.0', yaml: overBytes }).success).toBe(true);
  });
});

describe('the transport envelope admits every body the API accepts', () => {
  /** A draft create at every API limit: CJK YAML at the character cap and maximal CJK provenance. */
  function largestCreate(): Record<string, unknown> {
    return {
      name: 'largest-definition',
      yaml: cjkYaml(API_YAML_MAX_CHARS),
      visibility: 'private',
      provenance: {
        authorship_type: 'collaborative',
        optimization_run_id: s(100),
        contributors: Array.from({ length: 50 }, () => ({
          id: cjk(100),
          role: 'optimizer',
          type: 'agent',
          name: cjk(200),
          agent_name: cjk(200),
          contributed_at: '2026-10-25T12:00:00.000Z',
        })),
      },
    };
  }
  const createCall = (args: Record<string, unknown>): Record<string, unknown> => ({
    jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'create_definition', arguments: args },
  });

  it('a draft create at every API limit is valid input, over the old 500 KiB envelope, and passes the production pipeline', async () => {
    const args = largestCreate();
    expect(CreateDefinitionInputSchema.safeParse(args).success).toBe(true);
    const bytes = Buffer.byteLength(JSON.stringify(createCall(args)), 'utf8');
    expect(bytes).toBeGreaterThan(500 * 1024);
    expect(bytes).toBeLessThan(API_DEFINITION_BODY_LIMIT_BYTES);
    const result = await (await pipeline())(createCall(args));
    expect({ passed: result.passed, reason: result.reason }).toMatchObject({ passed: true });
  });

  it('CONTROL: a message over the envelope is refused by the same pipeline', async () => {
    const result = await (await pipeline())(call(s(ENVELOPE_BYTES + 1)));
    expect(result.passed).toBe(false);
  });
});
