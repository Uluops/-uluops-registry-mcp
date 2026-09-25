/**
 * The request envelope: one byte ceiling shared by all four stacked size settings
 * (maxMessageSize, maxStringLength, maxParamBytes, suspiciousMessageSize) in src/index.ts,
 * which apply to every request before any per-tool gate. Per-tool `maxArgsSize` in
 * tool-registry.ts sits BENEATH it: never above (it would be dead — the envelope fires first),
 * and exactly at it for the yaml-bearing tools, whose 500,000-char YAML parameter is the
 * largest legitimate payload, so their tool gate never binds before the envelope.
 * tool-registry-caps.test.ts asserts both.
 */
export const ENVELOPE_BYTES = 500 * 1024;
