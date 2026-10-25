import { z } from 'zod';

/**
 * An integer tool parameter whose advertised JSON Schema is exactly what zod 3's `.int()` emitted:
 * `{ "type": "integer" }`, with no bounds of its own.
 *
 * WHY not `z.number().int()` (zod-4 train T4): zod 4's `.int()` is a safe-integer format and the
 * MCP SDK advertises it with `maximum: 9007199254740991` (and `minimum` where none is set). That
 * is new on the wire to every client these tools are listed to — Claude Code passes them to
 * Anthropic, Codex to OpenAI. Anthropic accepts such bounds (probed for @uluops/core 0.52.0, with
 * a control); OpenAI could not be probed. Same decision as core's `toolInteger()` (ToolAdapter.ts):
 * keep the 0.16.x wire. Chain `.positive()`, `.min()`, `.max()` on it as on `z.number()`.
 * `src/__tests__/tool-integer-wire.test.ts` pins it.
 */
export const toolInteger = () => z.number().refine(Number.isInteger, 'Expected an integer').meta({ type: 'integer' });
