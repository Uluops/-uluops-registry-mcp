/**
 * Read YAML file from disk (sync) and resolve yaml/file_path input.
 *
 * Used by tools that accept `file_path` as an alternative to inline `yaml`.
 * Sync because `preProcess` callbacks are synchronous by contract.
 */

import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createErrorResponse, type McpToolResponse } from '../types/mcp.js';

const ALLOWED_EXTENSIONS = new Set(['.yaml', '.yml']);

/**
 * Get the base directory for file_path containment.
 * Resolved paths must start with this directory to prevent path traversal (CWE-22).
 * Defaults to cwd if WORKSPACE_DIR is not set.
 * Evaluated per-call so env var changes (e.g., in tests) take effect.
 */
function getWorkspaceDir(): string {
  return resolve(process.env['WORKSPACE_DIR'] ?? process.cwd());
}

/**
 * Read a YAML file from disk synchronously.
 * @param filePath - Absolute or relative path to a .yaml/.yml file.
 * @returns The raw file contents as a UTF-8 string.
 * @throws If the path escapes WORKSPACE_DIR, has an invalid extension, does not exist, or is unreadable.
 */
export function readYamlFile(filePath: string): string {
  const resolved = resolve(filePath);
  const workspaceDir = getWorkspaceDir();

  if (!resolved.startsWith(workspaceDir + '/') && resolved !== workspaceDir) {
    throw new Error(
      `file_path must resolve within ${workspaceDir} — got ${resolved}`
    );
  }

  const ext = extname(resolved).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Invalid file extension "${ext}". Only .yaml and .yml files are accepted.`
    );
  }

  try {
    return readFileSync(resolved, 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError.code === 'ENOENT') {
        throw new Error(`File not found: ${resolved}`);
      }
      if (fsError.code === 'EACCES') {
        throw new Error(`Permission denied: ${resolved}`);
      }
      throw new Error(`Failed to read file: ${resolved} (${fsError.code ?? 'unknown'})`);
    }
    throw new Error(`Failed to read file: ${resolved}`);
  }
}

/**
 * Resolve yaml/file_path mutual exclusion for tool preProcess hooks.
 * @param input - Parsed tool input containing optional `yaml` and/or `file_path`.
 * @param options - `{ required: true }` if at least one must be provided (create/validate), `false` for update.
 * @returns The input with `yaml` populated from file (if file_path given), or an McpToolResponse error.
 */
export function resolveYamlInput<T extends { yaml?: string; file_path?: string }>(
  input: T,
  options: { required: boolean }
): T | McpToolResponse {
  if (options.required && input.yaml === undefined && input.file_path === undefined) {
    return createErrorResponse('Provide either yaml or file_path');
  }
  if (input.yaml !== undefined && input.file_path !== undefined) {
    return createErrorResponse('Provide only one of yaml or file_path, not both');
  }
  if (input.file_path !== undefined) {
    return { ...input, yaml: readYamlFile(input.file_path) };
  }
  return input;
}
