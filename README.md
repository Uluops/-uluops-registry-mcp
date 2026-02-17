# UluOps Registry MCP Client

MCP (Model Context Protocol) client for the UluOps Registry API. Provides **31 tools** and **4 resources** that enable Claude Code to browse, create, validate, and manage AI workflow definitions (agents, commands, workflows, pipelines).

## Quick Setup (30 seconds)

```bash
git clone git@github.com:Uluops/-uluops-registry-mcp.git
cd -uluops-registry-mcp
./setup.sh YOUR_API_KEY
```

The setup script installs dependencies, builds the project, and prints the `.mcp.json` config snippet to paste into your project or `~/.claude/.mcp.json`.

Or do it manually:

```bash
npm install && npm run build
```

Then add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "uluops-registry": {
      "command": "node",
      "args": ["/absolute/path/to/registry-uluops-mcp/dist/index.js"],
      "env": {
        "ULUOPS_REGISTRY_URL": "http://localhost:3001/api/v1",
        "ULUOPS_API_KEY": "your-api-key"
      }
    }
  }
}
```

Restart Claude Code to pick up the new server.

## Design Philosophy

**Thin Client Pattern**: This MCP client contains **zero business logic**. All data processing, validation, storage, and rendering are handled by the registry API. The client's sole responsibility is protocol translation between MCP's stdio-based JSON-RPC and the backend's REST API.

## Configuration

All configuration is passed via environment variables in the `env` block of `.mcp.json`. No `.env` file needed.

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ULUOPS_REGISTRY_URL` | Registry API URL | Yes | - |
| `ULUOPS_API_KEY` | API authentication key | Yes | - |
| `ULUOPS_REGISTRY_TIMEOUT` | Request timeout (ms) | No | 30000 |
| `ULUOPS_REGISTRY_RETRIES` | Retry attempts | No | 3 |
| `LOG_LEVEL` | Logging level | No | info |

A `.env.example` is included for reference if you prefer file-based config during development.

## Quick Start Examples

Once configured, Claude Code can use the registry tools:

```typescript
// Browse published definitions
list_definitions({ type: "agent", status: "published", limit: 10 })

// Get a specific definition with its rendered YAML
get_definition({ type: "agent", name: "code-validator", include_yaml: true })

// Search across all definition types
search_definitions({ query: "validation", type: "agent" })

// Resolve a model alias
resolve_alias({ alias: "sonnet" })

// Validate YAML before publishing
validate_definition({ type: "agent", yaml: "..." })
```

## Available Tools

### Core Tools (P0)
| Tool | Description |
|------|-------------|
| `list_definitions` | List definitions with filters (type, status, domain, visibility, search, tags, pagination) |
| `get_definition` | Get a single definition by type+name, optionally with YAML/runtime/refs |
| `search_definitions` | Search definitions by keyword |
| `list_models` | List AI models with optional filters |
| `resolve_alias` | Resolve alias (e.g. "sonnet") to provider+modelId |
| `validate_definition` | Validate YAML without storing |
| `render_definition` | Get rendered markdown for a definition |

### Definition Management Tools (P1)
| Tool | Description |
|------|-------------|
| `create_definition` | Create a new draft definition with YAML content |
| `update_definition` | Update a draft definition (YAML, visibility, description, tags) |
| `publish_definition` | Publish a draft definition |
| `deprecate_definition` | Deprecate with reason and optional successor |
| `delete_definition` | Delete a draft (published definitions cannot be deleted) |

### Version & Dependency Tools (P1)
| Tool | Description |
|------|-------------|
| `list_versions` | List all versions of a definition |
| `diff_versions` | Compare two versions (YAML diff) |
| `get_dependencies` | Forward dependency graph |
| `get_dependents` | Reverse dependency graph |
| `get_execution_stats` | Execution statistics for a definition version |
| `list_forks` | List forks of a definition |

### Fork Tools (P2)
| Tool | Description |
|------|-------------|
| `fork_definition` | Fork a definition |
| `check_forkable` | Check if a definition version can be forked |
| `get_fork_lineage` | Fork ancestry chain |

### Translation Tools (P2)
| Tool | Description |
|------|-------------|
| `retranslate_definition` | Retranslate with the latest translator version |
| `upgrade_definition` | Upgrade a definition from legacy format |
| `get_translator_version` | Get current translator version |

### Model Tools (P2)
| Tool | Description |
|------|-------------|
| `get_model` | Get specific model details by provider+modelId |
| `list_providers` | List AI providers |
| `list_aliases` | List all model aliases |
| `sync_models` | Sync model catalog (admin) |

### Execution & User Tools (P2)
| Tool | Description |
|------|-------------|
| `record_execution` | Record a definition execution (idempotent) |
| `get_user` | Get public user profile |
| `batch_users` | Batch user lookup (max 100) |

## Available Resources

MCP resources provide read-only access to registry data via the `registry://` URI scheme.

| Resource | URI | Description |
|----------|-----|-------------|
| Definitions | `registry://definitions` | Published definitions (up to 100) |
| Models | `registry://models` | AI model catalog |
| Definition Types | `registry://definition-types` | Static list: agent, command, workflow, pipeline |
| Providers | `registry://providers` | AI provider list |

### Resource Usage

```typescript
// List published definitions
read_resource("registry://definitions")

// Browse available AI models
read_resource("registry://models")

// Get supported definition types with descriptions
read_resource("registry://definition-types")
```

## Rate Limiting Configuration

This client uses [mcp-secure-server](https://github.com/anthropics/mcp-secure-server) with configuration optimized for Claude Code's usage patterns.

```typescript
{
  securityLevel: 'basic',
  maxRequestsPerMinute: 120,
  burstThreshold: 15,
  burstWindowMs: 5000,
  automationDetection: {
    enabled: false,      // Claude Code is trusted automation
  },
}
```

Per-tool quotas are configured in `src/config/tool-registry.ts`. Read-heavy tools (list, get, search) allow up to 240 req/min. Write tools (create, update, publish) are 30-60 req/min. Admin operations like `sync_models` are tightly limited (10 req/min).

## Development

```bash
# Install dependencies
npm install

# Development mode with watch
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build
```

## License

MIT
