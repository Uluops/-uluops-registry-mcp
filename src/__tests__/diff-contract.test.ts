import { describe, expect, it, vi } from 'vitest';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';
import { registerDiffVersionsTool } from '../tools/diff-versions.js';

describe('diff contract forwarding', () => {
  it('forwards combined selection, preserves source bytes and keeps legacy omission', async () => {
    const response = { diffContract: 'combined-v1', full: true, unified: 'patch\n', sourceYaml: 'old\r\n', targetYaml: 'new 🌺' };
    const call = vi.fn().mockResolvedValue(response);
    const client = { versions: { diff: call } } as unknown as RegistryClient;
    let handler: Parameters<McpServerToolRegistration['tool']>[3] | undefined;
    const server: McpServerToolRegistration = {
      tool: (_name, _description, _schema, registered): void => { handler = registered; },
    };
    registerDiffVersionsTool(server, client);
    if (!handler) throw new Error('Tool was not registered');
    const input = { type: 'agent', name: 'example', from: '1.0.0', to: '2.0.0', format: 'unified', full: true };
    const selected = await handler({ ...input, diff_contract: 'combined-v1' });
    expect(selected.isError).not.toBe(true);
    expect(JSON.stringify(selected)).toContain('sourceYaml');
    expect(call.mock.calls[0].at(-1)).toEqual({ full: true, format: 'unified', diffContract: 'combined-v1' });
    await handler(input);
    expect(call.mock.calls[1].at(-1)).toEqual({ full: true, format: 'unified' });
    expect((await handler({ ...input, diff_contract: 'future' })).isError).toBe(true);
    expect(call).toHaveBeenCalledTimes(2);
  });
});
