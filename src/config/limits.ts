/**
 * The request envelope: one ceiling shared by the four stacked size settings in
 * config/server-options.ts (maxMessageSize, maxParamBytes and suspiciousMessageSize count
 * UTF-8 bytes; maxStringLength counts characters, and a string's character count can never
 * exceed the message's byte count, so the same value works for it). They apply to every request
 * before any per-tool gate, and only maxMessageSize can bind first. Per-tool `maxArgsSize` in
 * tool-registry.ts sits beneath the envelope, and exactly at it for the yaml-bearing tools, so
 * their tool gate never binds first. tool-registry-caps.test.ts asserts both.
 *
 * WHY THIS VALUE (0.18.0): the registry API's body limit on definition routes, plus headroom
 * for the JSON-RPC wrapper. The API reads definition bodies with `express.json({ limit: '1mb' })`
 * (`BODY_LIMITS.definition`, src/middleware/body.ts), which body-parser reads as 1 MiB. Any
 * body the API accepts therefore fits, whatever its YAML, provenance and metadata contain. The
 * same derivation as @uluops/ops-mcp's (its API's 2 MB limit plus 64 KiB).
 *
 * Before 0.18.0 this was 500 KiB, justified by a 500,000-char YAML. The API never accepted more
 * than 153,600 characters of YAML, but a draft create with a CJK YAML at that limit and the
 * API's maximum provenance (50 contributors, CJK names) comes to about 540 KB, over 500 KiB
 * (consumer-validate run #4, CGC-3). api-limits.test.ts sends that request through the
 * production pipeline.
 */
export const API_DEFINITION_BODY_LIMIT_BYTES = 1024 * 1024;

export const ENVELOPE_BYTES = API_DEFINITION_BODY_LIMIT_BYTES + 64 * 1024;
