/**
 * Field limits the registry API enforces, mirrored in this server's tool schemas.
 *
 * WHY: until 0.18.0 the tool schemas were looser than the API. YAML was allowed up to
 * 500,000 chars (and up to 5 MB when read from `file_path`), while the API refuses anything
 * over 153,600. Several strings had no cap at all. A request over an API limit travelled to
 * the API only to come back as a 400. Mirroring the caps here refuses it locally, by field
 * name, before any network call. Source: the 2026-10-25 registry-mcp length audit, read
 * against uluops-registry-api `src/routes/v1/schemas.ts` and `src/services/validation/index.ts`
 * at d10b723.
 *
 * UNITS: "character" here means a UTF-16 code unit, which is what JavaScript string length
 * and zod `.max()` count, on both sides. "Byte" means a UTF-8 byte.
 *
 * THE API LIMITS YAML IN TWO UNITS, BY ROUTE (consumer-validate run #4, wittgenstein GI-3):
 * - every yaml-carrying route checks 153,600 characters in its body schema;
 * - validation and publishing also check 153,600 UTF-8 bytes (`validateYamlSize`, called from
 *   `validateDefinition` for POST /validate and the publish gate).
 * ASCII YAML hits both limits at the same length. Non-ASCII YAML hits the byte limit first:
 * a CJK YAML over 51,200 characters can be saved as a draft but not published. The API labels
 * both limits "150KB"; the unit split is filed against the registry API (tracker 0639d482). This server mirrors
 * each limit where the API applies it: characters on every yaml tool, and bytes on
 * `update_and_publish`, whose update would otherwise land before its publish is refused.
 * `validate_definition` is not byte-checked here: over the byte limit the API answers with a
 * `valid: false` verdict (PAYLOAD_TOO_LARGE), which is the right response to pass through.
 *
 * Each value is the API's, never chosen here. When the API changes one, change it here in
 * the same release; nothing checks the two against each other automatically.
 */

/**
 * `yaml` on create, update, validate, render-preview and upgrade
 * (CreateDefinitionBodySchema and siblings: `.max(153600, 'YAML exceeds 150KB limit')`).
 * Characters, on every yaml route. The validation service's `MAX_YAML_SIZE = 150 * 1024` is a
 * different limit, in bytes: API_YAML_PUBLISH_MAX_BYTES below.
 */
export const API_YAML_MAX_CHARS = 153_600;

/**
 * The byte limit validation and publishing apply: `validateYamlSize`,
 * `Buffer.byteLength(yaml, 'utf-8') > 150 * 1024`. Mirrored on `update_and_publish` only.
 */
export const API_YAML_PUBLISH_MAX_BYTES = 153_600;

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

/**
 * Refusal messages. They name the unit, unlike the API's "150KB" label, so a caller trimming
 * the YAML trims the right quantity.
 */
export const YAML_TOO_LONG_MESSAGE = `YAML exceeds the registry API's limit of ${String(API_YAML_MAX_CHARS)} characters`;

/** `bytes` is the YAML's UTF-8 length. */
export function yamlTooLargeToPublishMessage(bytes: number): string {
  return (
    `YAML is ${String(bytes)} UTF-8 bytes; the registry API publishes YAML of at most ` +
    `${String(API_YAML_PUBLISH_MAX_BYTES)} UTF-8 bytes. Drafts are limited by characters and publishing by bytes, ` +
    `so non-ASCII YAML reaches the publish limit first. Shorten it, or save it with update_definition and do not publish.`
  );
}
