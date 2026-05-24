# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.14.0] - 2026-05-20

### Changed
- Custom credential redaction replaced with `sdk-core` `sanitizeString`

## [1.13.0] - 2026-05-18

### Changed
- `check_forkable` MCP tool renamed to `is_forkable`
- SDK method calls updated for `registry-sdk` v0.21.0 renames

## [1.12.0] - 2026-05-15

### Changed
- `forks.getLineage` renamed to `forks.getAncestry` after SDK rename

## [1.11.0] - 2026-05-07

### Added
- `nextAvailable` version surfaced in 409 conflict MCP response

### Fixed
- Definition write tool limits bumped to 1MB for large agent YAML files

## [1.10.0] - 2026-04-30

### Added
- `target` and `model` params on `render_definition` MCP tool

## [1.9.0] - 2026-04-28

### Added
- 402 `SubscriptionRequired` error handling with `source=mcp` tracking

## [1.8.0] - 2026-04-27

### Added
- `provenance` input on `create_definition` and `update_definition` tools
- `authorshipType` filter on `list_definitions` and `search_definitions` tools

## [1.7.0] - 2026-04-15

### Fixed
- `get_diff_impact` handler parameter access corrected

## [1.6.0] - 2026-04-12

### Added
- Pagination on `list_versions` tool
- `format` param on `diff_versions` tool (field-level, unified, summary)
- Session token authentication as alternative to API keys

## [1.5.0] - 2026-04-09

### Fixed
- `file_path` resolved before Zod parse in `update_and_publish`

## [1.4.0] - 2026-04-07

### Added
- `archive_definition` MCP tool
- `archived` status added to `DefinitionStatusSchema`
- `is_fork` filter on `list_definitions` and `search_definitions`
- 8 analytics tools: `get_effectiveness`, `compare_effectiveness`, `get_execution_stats`, `get_evolution`, `get_health`, `get_ecosystem_overview`, `get_translation_analytics`, `get_translator_version`

### Fixed
- `archive_definition` tool spec added to security registry
- `isFork` uses camelCase after `normalizeKeys` transformation

## [1.3.0] - 2026-03-29

### Added
- Org slug support via `ULUOPS_ORG_SLUG` env var

### Fixed
- Error handling overhauled for actionable agent-facing messages

## [1.2.0] - 2026-03-01

### Added
- Composite workflow tools: `update_and_publish`, `batch_publish`
- Summary mode as default for version diff
- `cognitive-lens` and `explorer` added to domain enum
- Production URL default so users only need API key

### Fixed
- String-typed numeric params coerced before Zod validation
- Symlink traversal prevented in file reads and writes (CWE-59)

## [1.1.0] - 2026-02-21

### Added
- `file_path` parameter on `create_definition`, `validate_definition`, `update_definition`, and `upgrade_definition` — read YAML from disk
- `output_path` on `render_definition` for direct file writing
- Session defaults, richer search, and response field selection
- Smart version-up on published or missing versions in `update_definition`
- Mutation tool responses trimmed of `yaml`/`runtimeMd` for conciseness
- `fields` meta-parameter exposed in MCP tool schemas

### Security
- Directory containment on `output_path` in `render_definition` (CWE-22)
- Directory containment on `file_path` in YAML tools (CWE-22)

### Fixed
- Redundant type assertions removed in `trimDefinitionResponse`
- Template expression safety for `fsError.code` in `readYamlFile`
- Double assertion pattern replaced with runtime type guard
- Dynamic imports replaced with static imports in `render_definition` catch block
- 70+ ship pipeline validation issues resolved across security, docs, type safety, and tests

## [1.0.0] - 2026-02-16

### Added
- Initial release of UluOps Registry MCP client
- 31 tools across 8 domains: definitions, models, versions, dependencies, forks, executions, translation, users
- 4 resources via `registry://` URI scheme
- `createToolHandler` factory with Zod validation, snake_case→camelCase normalization, and SDK error mapping
- Security hardening via `mcp-secure-server` with per-tool rate limits and payload size controls
- Error sanitization stripping sensitive data (API keys, tokens, stack traces) from MCP responses
- Test suite with 194 tests covering all tools, resources, and registry config

[Unreleased]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.14.0...HEAD
[1.14.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.13.0...v1.14.0
[1.13.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.12.0...v1.13.0
[1.12.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Uluops/-uluops-registry-mcp/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Uluops/-uluops-registry-mcp/releases/tag/v1.0.0
