# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-02-21

### Added
- `file_path` parameter on `create_definition`, `validate_definition`, `update_definition`, and `upgrade_definition` tools — read YAML from disk instead of passing inline
- `readYamlFile` utility with extension validation (`.yaml`/`.yml` only) and descriptive error messages
- `resolveYamlInput` helper for mutual-exclusion logic between `yaml` and `file_path` parameters

### Security
- Directory containment on `output_path` in `render_definition` — paths must resolve within `OUTPUT_BASE_DIR` (CWE-22)
- Directory containment on `file_path` in YAML tools — paths must resolve within `WORKSPACE_DIR` (CWE-22)

### Fixed
- Redundant type assertions in `trimDefinitionResponse` removed
- Template expression safety for `fsError.code` in `readYamlFile`
- Double assertion pattern in `render_definition` replaced with runtime type guard
- Dynamic imports in `render_definition` catch block replaced with static imports

## [1.0.0] - 2026-02-16

### Added
- Initial release of UluOps Registry MCP client
- 31 tools across 8 domains: definitions, models, versions, dependencies, forks, executions, translation, users
- 4 resources via `registry://` URI scheme
- `createToolHandler` factory with Zod validation, snake_case->camelCase normalization, and SDK error mapping
- Security hardening via `mcp-secure-server` with per-tool rate limits and payload size controls
- Error sanitization stripping sensitive data (API keys, tokens, stack traces) from MCP responses
