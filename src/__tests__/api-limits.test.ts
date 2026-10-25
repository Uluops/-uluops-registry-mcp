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
  API_RUN_ID_MAX_CHARS, YAML_TOO_LONG_MESSAGE,
} from '../config/api-limits.js';
import { ENVELOPE_BYTES } from '../config/limits.js';
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

/** YAML of exactly `chars` characters whose text is CJK: 3 UTF-8 bytes per character, the realistic worst case. */
function cjkYaml(chars: number): string {
  let out = 'agent:\n  notes: |\n';
  while (out.length < chars) out += '    设计评审记录了所有的问题和建议。设计评审记录了所有的问题和建议。\n';
  return out.slice(0, chars);
}

describe('the transport envelope admits the largest YAML the API accepts', () => {
  it('a CJK YAML at the API cap passes the production pipeline', async () => {
    const message = call(cjkYaml(API_YAML_MAX_CHARS));
    expect(Buffer.byteLength(JSON.stringify(message), 'utf8')).toBeGreaterThan(400_000);
    const result = await (await pipeline())(message);
    expect({ passed: result.passed, reason: result.reason }).toMatchObject({ passed: true });
  });

  it('CONTROL: a message over the envelope is refused by the same pipeline', async () => {
    const result = await (await pipeline())(call(s(ENVELOPE_BYTES + 1)));
    expect(result.passed).toBe(false);
  });
});
