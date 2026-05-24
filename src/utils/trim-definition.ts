/**
 * Trims large fields from definition responses to reduce token consumption.
 *
 * MCP responses containing full YAML and rendered markdown can exceed 16k tokens
 * per call. For mutation operations (create, update, publish, deprecate), the caller
 * already has the YAML — returning it wastes context window.
 */

const PREVIEW_LENGTH = 25;

/**
 * Replace `yaml` and `runtimeMd` with short previews in a definition response.
 * Preserves all other fields (status, version, hash, etc.) untouched.
 */
export function trimDefinitionResponse(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data;

  const record = data as Record<string, unknown>;
  const trimmed = { ...record };

  if (typeof trimmed.yaml === 'string') {
    const len = trimmed.yaml.length;
    trimmed.yaml = `${trimmed.yaml.slice(0, PREVIEW_LENGTH)}... (${String(len)} chars)`;
  }

  if (typeof trimmed.runtimeMd === 'string') {
    const len = trimmed.runtimeMd.length;
    trimmed.runtimeMd = `${trimmed.runtimeMd.slice(0, PREVIEW_LENGTH)}... (${String(len)} chars)`;
  }

  return trimmed;
}
