**[UluOps](https://uluops.ai)** · Operating Intelligence as Infrastructure

---

# @uluops/registry-mcp

[![npm version](https://img.shields.io/npm/v/@uluops/registry-mcp.svg)](https://www.npmjs.com/package/@uluops/registry-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/@uluops/registry-mcp)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](src/__tests__/)

MCP (Model Context Protocol) server for the [UluOps](https://uluops.ai) Registry API. Provides **44 tools** and **4 resources** that let Claude Code, OpenCode, Gemini CLI, and other MCP-compatible harnesses browse, create, validate, version, and analyze AI workflow definitions (agents, commands, workflows, pipelines).

## Quick start

The recommended way to install this is via [@uluops/setup](https://www.npmjs.com/package/@uluops/setup), which writes the MCP config for you:

```bash
npx @uluops/setup
```

If you'd rather wire it up by hand, add this block to your harness's MCP config (e.g. `~/.claude.json` for Claude Code, `~/.config/opencode/opencode.json` for OpenCode):

```json
{
  "mcpServers": {
    "uluops-registry": {
      "command": "npx",
      "args": ["-y", "@uluops/registry-mcp"],
      "env": {
        "ULUOPS_API_KEY": "your-api-key"
      }
    }
  }
}
```

Get an API key at [app.uluops.ai/settings/api-keys](https://app.uluops.ai/settings/api-keys), then restart your harness.

## Configuration

All configuration is passed via environment variables in the `env` block. No `.env` file is needed.

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ULUOPS_API_KEY` | API authentication key | Yes | — |
| `ULUOPS_ORG_SLUG` | Organization slug for scoped requests | No | — |
| `ULUOPS_REGISTRY_TIMEOUT` | Request timeout (ms) | No | `30000` |
| `ULUOPS_REGISTRY_RETRIES` | Retry attempts | No | `3` |
| `LOG_LEVEL` | Logging level (`error`, `warn`, `info`, `debug`) | No | `info` |
| `ENABLE_FILE_LOGGING` | Write logs to disk | No | `false` |
| `LOG_DIR` | Log file directory | No | `./logs` |
| `VERBOSE_LOGGING` | Verbose security decision logging | No | `false` |
| `LOG_PERFORMANCE_METRICS` | Log performance metrics | No | `false` |
| `WORKSPACE_DIR` | Base directory for `file_path` containment (CWE-22 protection) | No | cwd |
| `OUTPUT_BASE_DIR` | Base directory for `output_path` containment (CWE-22 protection) | No | cwd |

## Design philosophy

**Thin client pattern.** This MCP server contains **zero business logic**. All data processing, validation, storage, and rendering are handled by the registry API. The server's sole responsibility is protocol translation between MCP's stdio JSON-RPC and the backend REST API.

## Quick examples

Once configured, your harness can invoke these tools through MCP:

```jsonc
// Browse published definitions
list_definitions({ "type": "agent", "status": "published", "limit": 10 })

// Get a specific definition with its rendered YAML
get_definition({ type: "agent", name: "code-validator", include_yaml: true })

// Search across all definition types
search_definitions({ query: "validation", type: "agent" })

// Validate YAML before publishing (inline or by file path)
validate_definition({ type: "agent", yaml: "..." })
validate_definition({ type: "agent", file_path: "/path/to/agent.yaml" })

// Create and publish a definition
create_definition({ type: "agent", name: "my-agent", yaml: "..." })
publish_definition({ type: "agent", name: "my-agent", version: "1.0.0" })

// One-call create-or-update-and-publish
update_and_publish({ type: "agent", name: "my-agent", version: "1.1.0", yaml: "..." })

// Compare versions in three different formats
diff_versions({ type: "agent", name: "code-validator", from: "1.0.0", to: "1.1.0" })                  // section summary
diff_versions({ type: "agent", name: "code-validator", from: "1.0.0", to: "1.1.0", format: "fields" })  // structural diff + suggested bump
diff_versions({ type: "agent", name: "code-validator", from: "1.0.0", to: "1.1.0", format: "unified" }) // git-style diff

// Analytics
get_effectiveness({ type: "agent", name: "code-validator", version: "1.1.0" })
compare_effectiveness({ type: "agent", name: "code-validator", versions: ["1.0.0", "1.1.0"] })
```

## Available tools

### Core tools (P0)
| Tool | Description |
|------|-------------|
| `list_definitions` | List definitions with filters (type, status, domain, visibility, search, tags, pagination) |
| `get_definition` | Get a single definition by type + name, optionally with YAML / runtime / refs |
| `search_definitions` | Search definitions by keyword |
| `list_models` | List AI models with optional filters |
| `resolve_alias` | Resolve an alias (e.g. `sonnet`) to provider + modelId |
| `validate_definition` | Validate YAML without storing (accepts `yaml` or `file_path`) |
| `render_definition` | Get rendered markdown for a definition. `output_path` writes directly to a file |

### Definition management (P1)
| Tool | Description |
|------|-------------|
| `create_definition` | Create a new draft definition (accepts `yaml` or `file_path`) |
| `update_definition` | Update a draft definition. Smart version-up: if target version is published or doesn't exist and YAML is provided, automatically creates a new draft |
| `publish_definition` | Publish a draft definition |
| `deprecate_definition` | Deprecate with reason and optional successor |
| `archive_definition` | Archive a deprecated definition (terminal lifecycle state) |
| `delete_definition` | Delete a draft (published definitions cannot be deleted) |

### Composite workflows (P1)
| Tool | Description |
|------|-------------|
| `update_and_publish` | Update a draft and publish it in one call. Inherits smart version-up + create fallback from `update_definition` |
| `batch_publish` | Publish up to 20 definition versions in one call. Continues on individual failures, returns both published and failed items |

### Versions & dependencies (P1)
| Tool | Description |
|------|-------------|
| `list_versions` | List all versions of a definition |
| `diff_versions` | Compare two versions. `format`: `sections` (default), `fields` (structural + suggested bump), `unified` (git-style) |
| `get_dependencies` | Forward dependency graph |
| `get_dependents` | Reverse dependency graph |
| `get_execution_stats` | Execution statistics for a definition version |
| `list_forks` | List forks of a definition |

### Forks (P2)
| Tool | Description |
|------|-------------|
| `fork_definition` | Fork a definition |
| `is_forkable` | Check if a definition version can be forked |
| `get_fork_lineage` | Fork ancestry chain |

### Translation (P2)
| Tool | Description |
|------|-------------|
| `retranslate_definition` | Retranslate with the latest translator version |
| `upgrade_definition` | Upgrade a definition from legacy format (accepts `yaml` or `file_path`) |
| `get_translator_version` | Get current translator version |

### Models & languages (P2)
| Tool | Description |
|------|-------------|
| `get_model` | Get specific model details by provider + modelId |
| `list_providers` | List AI providers |
| `list_aliases` | List all model aliases |
| `list_languages` | List supported definition languages (ADL, CDL, WDL, PDL) |
| `get_language` | Get a definition language with its current JSON Schema |

### Execution & users (P2)
| Tool | Description |
|------|-------------|
| `record_execution` | Record a definition execution (idempotent) |
| `get_user` | Get public user profile |
| `batch_users` | Batch user lookup (max 100) |

### Analytics (P3)
| Tool | Description |
|------|-------------|
| `get_effectiveness` | Effectiveness metrics for a definition: pass rate, scores, taxonomy, health score |
| `get_health` | Health grade and issue profile for a definition |
| `get_ecosystem_overview` | Ecosystem-wide analytics overview |
| `get_lineage` | Lineage graph for a definition (versions + forks as a tree) |
| `get_evolution` | Version-over-version metrics with trend detection |
| `get_translation_analytics` | Versions grouped by translator version with aggregate metrics |
| `compare_effectiveness` | Compare effectiveness across 2–5 definition versions side-by-side |
| `get_diff_impact` | Structural diff combined with metric deltas between two versions |

### Session
| Tool | Description |
|------|-------------|
| `set_default_type` | Set (or clear) a session-level default for the `type` parameter. When set, definition tools use this type unless explicitly overridden |

## Available resources

MCP resources provide read-only access to registry data via the `registry://` URI scheme.

| Resource | URI | Description |
|----------|-----|-------------|
| Definitions | `registry://definitions` | Published definitions (up to 100) |
| Models | `registry://models` | AI model catalog |
| Definition types | `registry://definition-types` | Static list: agent, command, workflow, pipeline |
| Providers | `registry://providers` | AI provider list |

```typescript
read_resource("registry://definitions")
read_resource("registry://models")
read_resource("registry://definition-types")
```

## Rate limiting

This server uses [mcp-secure-server](https://github.com/aself101/mcp-secure-server) with configuration tuned for typical harness usage patterns. Source of truth: `src/index.ts` (global) and `src/config/tool-registry.ts` (per-tool).

| Setting | Value | Notes |
|---------|-------|-------|
| Security level | `basic` | |
| Max requests/min | 120 | Global rate limit |
| Burst threshold | 15 | Requests within burst window |
| Burst window | 5000 ms | |
| Automation detection | Disabled | The calling harness is trusted automation |

Per-tool quotas are configured in `src/config/tool-registry.ts`. Read-heavy tools (list, get, search) allow up to 240 req/min. Write tools (create, update, publish) are 30–60 req/min.

## Development

```bash
git clone git@github.com:Uluops/-uluops-registry-mcp.git
cd -uluops-registry-mcp
npm install
npm run build
npm test            # 348 tests
npm run typecheck
npm run lint
```

## Requirements

- **Node.js:** ≥ 18
- **Platform:** Linux, macOS, or WSL2
- **Auth:** UluOps API key ([get one here](https://app.uluops.ai/settings/api-keys))

## License

MIT
