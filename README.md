**[UluOps](https://uluops.ai)** · The operations layer for agentic work

---

# @uluops/registry-mcp

[![npm version](https://img.shields.io/npm/v/@uluops/registry-mcp.svg)](https://www.npmjs.com/package/@uluops/registry-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/@uluops/registry-mcp)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](src/__tests__/)

MCP (Model Context Protocol) server for the [UluOps](https://uluops.ai) Registry API. Provides **44 tools** and **4 resources** that let Claude Code, OpenCode, Gemini CLI, and other MCP-compatible harnesses browse, create, validate, version, and analyze AI workflow definitions (agents, commands, workflows, pipelines).

Requires Node.js 20.3 or newer. Create an API key at [app.uluops.ai/settings/api-keys](https://app.uluops.ai/settings/api-keys); API keys begin with `ulr_`.

## Quick start

To check the package without changing your harness configuration, run:

```bash
npx -y @uluops/registry-mcp --version
```

To connect the server, add this block to your harness's MCP config (e.g. `~/.claude.json` for Claude Code, `~/.config/opencode/opencode.json` for OpenCode):

```json
{
  "mcpServers": {
    "uluops-registry": {
      "command": "npx",
      "args": ["-y", "@uluops/registry-mcp"],
      "env": {
        "ULUOPS_API_KEY": "ulr_your-api-key"
      }
    }
  }
}
```

Replace the example value with your API key, then restart your harness. To have your harness configuration written for you, use [@uluops/setup](https://www.npmjs.com/package/@uluops/setup): `npx @uluops/setup`.

## Configuration

All configuration is passed via environment variables in the `env` block. No `.env` file is needed.

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ULUOPS_API_KEY` | API key (`ulr_` prefix) from [API key settings](https://app.uluops.ai/settings/api-keys), or a session token | Yes | — |
| `ULUOPS_ORG_SLUG` | Org for **definition writes**: sent as `X-Org-Slug` on create, update, publish, deprecate, archive, delete, retranslate, upgrade, and fork (the org the fork goes into), where it says which org's definition a name means. Reads and other calls (validate, render, record execution, user lookups) never carry it (since 0.11.0), so the marketplace stays readable; your org's private definitions still appear by membership. **A bare name on a read means the org that first published it**, so for a name another org published first, a read and a write of it mean different rows — check `namespace` (now in the compact list output) before writing back what you read. | No | — |
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
diff_versions({ type: "agent", name: "code-validator", from: "1.0.0", to: "1.1.0", format: "unified", diff_contract: "combined-v1", full: true }) // patch + exact YAML

// Analytics
get_effectiveness({ type: "agent", name: "code-validator", version: "1.1.0" })
compare_effectiveness({ type: "agent", name: "code-validator", versions: ["1.0.0", "1.1.0"] })
```

## Available tools

### Core tools (P0)
| Tool | Description |
|------|-------------|
| `list_definitions` | List definitions with filters (type, status, domain, visibility, search, tags, pagination). `format`: `compact` (default — type, name, version, status, visibility, description per item), `full` (all catalog fields) |
| `get_definition` | Get a single definition by type + name, optionally with YAML / runtime / refs |
| `search_definitions` | Search definitions by keyword |
| `list_models` | List AI models with optional filters |
| `resolve_alias` | Resolve an alias (e.g. `sonnet`) to provider + modelId |
| `validate_definition` | Validate YAML without storing (accepts `yaml` or `file_path`) |
| `render_definition` | Get rendered markdown for a definition. `output_path` writes directly to a file |

`render_definition` uses the `uluops-full` render profile when `render_profile` is
omitted, including UluOps-specific content. Pass `render_profile: "core"` explicitly
to render without that content; both inline and file-write results report the effective profile.

`output_path` writes on the **MCP server host**, within `OUTPUT_BASE_DIR` (default:
server process cwd). Relative paths resolve from that cwd, even when a different
root is configured. The root must exist; missing directories below it are created.
Paths outside the root and traversal escaping it are refused. Existing symlinks in
the file or directories below the root are checked and refused before rendering. Existing files require `overwrite: true`. Remote clients
should omit `output_path` and consume `markdown` inline.

File responses retain the inline rendering metadata (`target`, `renderProfile`,
`selectedModel`, `promptHash`, `warnings`, and any SDK metadata when supplied) alongside `success`,
`output_path`, and UTF-8 `bytes`; `markdown` is written to disk. Warnings and optional
metadata have the same presence and values as inline output.

```jsonc
// Inline output for remote clients
render_definition({ type: "agent", name: "code-validator", target: "codex" })
// Write beneath the server cwd (or use an absolute path inside OUTPUT_BASE_DIR)
render_definition({ type: "agent", name: "code-validator", target: "codex", output_path: "output/code-validator.toml" })
// Explicit replacement retains rendering diagnostics
render_definition({ type: "agent", name: "code-validator", target: "codex", output_path: "output/code-validator.toml", overwrite: true })
```

### Definition management (P1)
| Tool | Description |
|------|-------------|
| `create_definition` | Create a new draft definition (accepts `yaml` or `file_path`) |
| `update_definition` | Update a draft definition. Smart version-up: if target version is published or doesn't exist and YAML is provided, automatically creates a new draft |
| `publish_definition` | Publish a draft definition |
| `deprecate_definition` | Deprecate with reason and optional successor |
| `archive_definition` | Archive a deprecated definition (terminal lifecycle state) |
| `delete_definition` | Delete a definition version, including published, deprecated, or archived versions when no dependents or forks block deletion. A blocked delete returns `DELETE_BLOCKED` with a recovery action; hidden references are not disclosed |

### Composite workflows (P1)
| Tool | Description |
|------|-------------|
| `update_and_publish` | Update a draft and publish it in one call. Inherits smart version-up + create fallback from `update_definition` |
| `batch_publish` | Publish up to 20 definition versions in one call. Continues on individual failures, returns both published and failed items |

### Versions & dependencies (P1)
| Tool | Description |
|------|-------------|
| `list_versions` | List all versions of a definition |
| `diff_versions` | Compare two versions. `format`: `sections` (default), `fields` (structural + suggested bump), `unified`. Select `diff_contract="combined-v1"` for an applicable patch; `full=true` adds exact YAML. |
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

`upgrade_definition` applies to legacy definitions without storage/translation metadata and creates a new major version. Current-format drafts and already translated definitions return a structured refusal with `applicationState: not_applied`, a reason, and recovery guidance. Use publish or retranslate when indicated.

If an upgrade response fails validation, the result carries `applicationState: unknown`: the write may already have committed. Read the definition and list its versions before retrying. Successful responses preserve the previous version and translated artifact metadata. These upgrade semantics require Registry API 0.59.4 or newer.

Lifecycle refusals now carry `allowedTransitions`; blocked deletion carries `blockingResources: { present: true }` and a specific recovery action without exposing hidden references. A bad render target lists available targets once. For any write whose SDK response validation fails, `applicationState: unknown` means read current state before retrying.


### Models & languages (P2)
| Tool | Description |
|------|-------------|
| `get_model` | Get specific model details by provider + modelId |
| `list_providers` | List AI providers |
| `list_aliases` | List all model aliases |
| `list_languages` | List supported definition languages (ADL, CDL, WDL, PDL) |
| `get_language` | Get a definition language with its JSON Schema. `format`: `compact` (default — condensed digest sufficient to author a definition, ~50–75% smaller), `full` (complete JSON Schema with patterns, bounds, and examples) |

### Execution & users (P2)
| Tool | Description |
|------|-------------|
| `record_execution` | Record a definition execution (idempotent). Admin-only — executions are recorded automatically by the runtime; user keys get a 403 explaining this |
| `get_user` | Get public user profile |
| `batch_users` | Batch user lookup (max 100) |

### Analytics (P3)
| Tool | Description |
|------|-------------|
| `get_effectiveness` | Effectiveness metrics: voter-weighted quality (one actor, one vote) with the `provenance` block — `independent` vs `selfReported` split, confidence label. Agents are score-only (`passRate: null`) |
| `get_health` | Health grade and issue profile for a definition; the pass-rate factor requires 3+ qualifying actors |
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

This server uses [mcp-secure-server](https://github.com/aself101/mcp-secure-server) with configuration tuned for typical harness usage patterns. Source of truth: `src/index.ts` (global), `src/config/limits.ts` (the shared envelope), `src/config/tool-registry.ts` (per-tool caps and quotas), and `tool-policies.json` (per-tool security level and relaxed fields — loaded explicitly since 0.8.2; `yaml` is not pattern-scanned at this layer, the registry API scans definitions at publish).

| Setting | Value | Notes |
|---------|-------|-------|
| Security level | `basic` | |
| Max requests/min | 120 | Global rate limit |
| Max message size | 500 KB | Layer 1 envelope |
| Max string length | 500 KB | Per-string cap — definition tools carry full YAML in one field |
| Max param bytes | 500 KB | Layer 2 serialized-params cap (requires `mcp-secure-server >= 0.0.19-security`) |
| Suspicious message size | 500 KB | Layer 3 hard block, not a log-only flag |
| Burst threshold | 15 | Requests within burst window |
| Burst window | 5000 ms | |
| Automation detection | Disabled | The calling harness is trusted automation |

The four size settings are stacked ceilings — a rejection names whichever fires first, so they share one value, `ENVELOPE_BYTES`; the per-tool `maxArgsSize` in `tool-registry.ts` is the tool-scoped gate beneath them (never above; exactly at it for the YAML tools). Each tool's `maxEgressBytes` is kept ≥ 16 × its `maxArgsSize`, because mcp-secure-server checks egress at request time as argument bytes × 16.

Per-tool quotas are configured in `src/config/tool-registry.ts`. Read-heavy tools (list, get, search) allow up to 240 req/min. Write tools (create, update, publish) are 30–60 req/min.

## Development

```bash
git clone git@github.com:Uluops/-uluops-registry-mcp.git
cd -uluops-registry-mcp
npm install
npm run build
npm test
npm run typecheck
npm run lint
```

## License

MIT

## Quality metric contracts (F04)

`compare_effectiveness` and `get_diff_impact` accept optional `quality_contract: "nullable-v1"`. Select it to preserve absent gate rates/deltas as null with run-weighted basis, gate denominator, and fraction units. Agent gate rates are null. Omission keeps legacy behavior. Requires the F04-capable Registry SDK and producer capability; unsupported selection returns `UNSUPPORTED_CONTRACT` instead of legacy numbers. Release the tolerant SDK and producer before enabling this option.

### Applicable unified diffs

Call `diff_versions` with `format: "unified"` and `diff_contract: "combined-v1"`.
Add `full: true` to receive exact `sourceYaml`/`targetYaml` alongside `unified`.
An unchanged pair returns an empty patch. The SDK negotiates support and refuses
unsupported servers without falling back. Legacy omission keeps `full=true`
precedence (raw `fromYaml`/`toYaml`, no patch) until a future major release with
at least 90 days notice.
