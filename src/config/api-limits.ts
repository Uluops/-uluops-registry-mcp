/**
 * Field limits the registry API enforces, mirrored in this server's tool schemas.
 *
 * WHY: until 0.18.0 the tool schemas were looser than the API. YAML was allowed up to
 * 500,000 chars (and up to 5 MB when read from `file_path`), while the API refuses anything
 * over 153,600. Several strings had no cap at all. A request over an API limit travelled to
 * the API only to come back as a 400. Mirroring the caps here refuses it locally, by field
 * name, before any network call. Source: the 2026-10-25 registry-mcp length audit, read
 * against uluops-registry-api `src/routes/v1/schemas.ts` at d10b723.
 *
 * Each value is the API's, never chosen here. When the API changes one, change it here in
 * the same release; nothing checks the two against each other automatically.
 *
 * The transport envelope (limits.ts, 500 KiB) is a separate, outer ceiling. The largest
 * request these caps admit fits inside it: a YAML of 153,600 CJK characters (3 UTF-8 bytes
 * each) serializes to about 441 KB. tool-registry-caps.test.ts sends that payload through
 * the real validation pipeline.
 */

/**
 * `yaml` on create, update, validate, render-preview and upgrade
 * (CreateDefinitionBodySchema and siblings: `.max(153600, 'YAML exceeds 150KB limit')`).
 * Also enforced in the API's validation service as `MAX_YAML_SIZE = 150 * 1024`.
 */
export const API_YAML_MAX_CHARS = 153_600;

/** UpdateDefinitionBodySchema: `description` .max(1000); `tags` array .max(32) of strings .max(50). */
export const API_DESCRIPTION_MAX_CHARS = 1000;
export const API_TAGS_MAX_ITEMS = 32;
export const API_TAG_MAX_CHARS = 50;

/**
 * DeprecateDefinitionBodySchema: `reason` .min(1).max(500); `successor` must match
 * name or name@version.
 */
export const API_DEPRECATION_REASON_MAX_CHARS = 500;
export const API_SUCCESSOR_PATTERN = /^[a-z][a-z0-9-]*(@\d+\.\d+\.\d+)?$/;

/** ForkDefinitionBodySchema: `name` .max(200) and lowercase letters, digits and hyphens. */
export const API_DEFINITION_NAME_MAX_CHARS = 200;
export const API_DEFINITION_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/** RecordExecutionBodySchema: `source` .min(1).max(32); `runId` .max(64). */
export const API_EXECUTION_SOURCE_MAX_CHARS = 32;
export const API_RUN_ID_MAX_CHARS = 64;

/** The API's own message, reused so a local refusal reads the same as a remote one. */
export const YAML_TOO_LONG_MESSAGE = `YAML exceeds 150KB limit (${String(API_YAML_MAX_CHARS)} characters, the registry API's cap)`;
