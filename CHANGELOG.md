# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-16

### Added
- Initial release of UluOps Registry MCP client
- 31 tools across 8 domains: definitions, models, versions, dependencies, forks, executions, translation, users
- 4 resources via `registry://` URI scheme
- `createToolHandler` factory with Zod validation, snake_case->camelCase normalization, and SDK error mapping
- Security hardening via `mcp-secure-server` with per-tool rate limits and payload size controls
- Error sanitization stripping sensitive data (API keys, tokens, stack traces) from MCP responses
