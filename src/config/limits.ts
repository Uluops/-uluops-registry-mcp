/**
 * The request envelope: one byte ceiling shared by all four stacked size settings
 * (maxMessageSize, maxStringLength, maxParamBytes, suspiciousMessageSize) in src/index.ts,
 * which apply to every request before any per-tool gate. Per-tool `maxArgsSize` in
 * tool-registry.ts sits BENEATH it: never above (it would be dead — the envelope fires first),
 * and exactly at it for the yaml-bearing tools, so their tool gate never binds before the envelope.
 *
 * WHY 500 KiB (re-derived 0.18.0, against the registry API): the largest request the API accepts
 * is a definition YAML at its cap of 153,600 characters (config/api-limits.ts). Serialized into a
 * JSON-RPC message that is about 160 KB for ASCII, about 307 KB for the worst escaping (all
 * newlines), and about 441 KB for CJK text at 3 UTF-8 bytes a character: all under 512,000 bytes.
 * The API's own definition body limit is 1 MB, sized for bodies of escaped control characters
 * that its YAML parser refuses anyway, so matching it would admit nothing legitimate.
 * api-limits.test.ts sends the CJK case through the production pipeline. Until 0.18.0 this
 * comment cited a 500,000-char YAML as the largest payload; the API never accepted more than
 * 153,600.
 * tool-registry-caps.test.ts asserts both.
 */
export const ENVELOPE_BYTES = 500 * 1024;
