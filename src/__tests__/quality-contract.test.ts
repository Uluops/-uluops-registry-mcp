import { describe, expect, it, vi } from 'vitest';
import type { RegistryClient } from '@uluops/registry-sdk';
import type { McpServerToolRegistration } from '../types/index.js';
import { registerCompareEffectivenessTool } from '../tools/compare-effectiveness.js';
import { registerGetDiffImpactTool } from '../tools/get-diff-impact.js';

describe('quality contract forwarding', () => {
  for (const variant of ['compare', 'diff'] as const) {
    it(`${variant} forwards the selected contract and preserves omission`, async () => {
      const call = vi.fn().mockResolvedValue({ passRate: null });
      const client = { analytics: { compare: call, getDiffImpact: call } } as unknown as RegistryClient;
      let handler: Parameters<McpServerToolRegistration['tool']>[3] | undefined;
      const server: McpServerToolRegistration = {
        tool: (_name, _description, _schema, registered): void => { handler = registered; },
      };
      const input = variant === 'compare'
        ? { type: 'agent', name: 'explorer', versions: ['1.0.0', '2.0.0'] }
        : { type: 'agent', name: 'explorer', from: '1.0.0', to: '2.0.0' };
      (variant === 'compare' ? registerCompareEffectivenessTool : registerGetDiffImpactTool)(server, client);
      if (handler === undefined) throw new Error('Tool was not registered');
      const selected = await handler({ ...input, quality_contract: 'nullable-v1' });
      expect(selected.isError).not.toBe(true);
      expect(call.mock.calls[0].at(-1)).toEqual({ qualityContract: 'nullable-v1' });
      await handler(input);
      expect(call.mock.calls[1].at(-1)).toBeUndefined();
      const rejected = await handler({ ...input, quality_contract: 'unsupported' });
      expect(rejected.isError).toBe(true);
      expect(call).toHaveBeenCalledTimes(2);
    });
  }
});
