#!/usr/bin/env bash
set -euo pipefail

# UluOps Registry MCP Server — Quick Setup
#
# Usage:
#   ./setup.sh                    # Interactive: prompts for API key
#   ./setup.sh <api-key>          # Non-interactive: pass API key as argument
#   ./setup.sh --print-config     # Just print the .mcp.json snippet

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_ENTRY="$SCRIPT_DIR/dist/index.js"
DEFAULT_URL="http://localhost:3001/api/v1"

print_config() {
  local api_key="${1:-your-api-key}"
  local api_url="${2:-$DEFAULT_URL}"
  cat <<EOF

Add this to your .mcp.json (project-level or ~/.claude/.mcp.json for global):

{
  "mcpServers": {
    "uluops-registry": {
      "command": "node",
      "args": ["$DIST_ENTRY"],
      "env": {
        "ULUOPS_REGISTRY_URL": "$api_url",
        "ULUOPS_API_KEY": "$api_key"
      }
    }
  }
}

Restart Claude Code to pick up the new MCP server.
EOF
}

if [[ "${1:-}" == "--print-config" ]]; then
  print_config
  exit 0
fi

echo "=== UluOps Registry MCP Server Setup ==="
echo ""

# Step 1: Install dependencies
if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
  echo "[1/3] Installing dependencies..."
  cd "$SCRIPT_DIR" && npm install --silent
else
  echo "[1/3] Dependencies already installed."
fi

# Step 2: Build
echo "[2/3] Building..."
cd "$SCRIPT_DIR" && npm run build --silent

# Step 3: Generate config
echo "[3/3] Setup complete!"
echo ""

API_KEY="${1:-}"
if [[ -z "$API_KEY" ]]; then
  read -rp "Enter your UluOps API key (or press Enter to skip): " API_KEY
fi

if [[ -n "$API_KEY" ]]; then
  print_config "$API_KEY"
else
  print_config
fi
