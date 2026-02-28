#!/usr/bin/env bash
# Install OpenClaw and configure it to use a local Ollama server.
# Run on macOS (or where Ollama runs): bash install-openclaw-ollama.sh [--remote] [--dry-run] [--yes]
#
# Options:
#   --remote   Bind gateway to LAN and allow Control UI from other machines (e.g. Windows).
#   --dry-run  Print commands, do not change the system.
#   --yes      Skip confirmation prompts.

set -e

DRY_RUN=false
YES=false
REMOTE=false

# Defaults (override with env if needed)
OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
PRIMARY_MODEL="${PRIMARY_MODEL:-ollama/llama3.2:3b}"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --yes)     YES=true ;;
    --remote)  REMOTE=true ;;
  esac
done

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] $*"
  else
    echo "> $*"
    "$@"
  fi
}

confirm() {
  if [[ "$YES" == true ]]; then
    return 0
  fi
  echo -n "$1 (y/N): "
  read -r answer
  [[ "$answer" == [yY] || "$answer" == [yY][eE][sS] ]]
}

# Ensure we have Node/npm (required for OpenClaw)
if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
  echo "Node.js and npm are required. Install from https://nodejs.org or via your package manager."
  exit 1
fi

echo "=== OpenClaw install with local Ollama ==="
echo "  OLLAMA_BASE_URL=$OLLAMA_BASE_URL"
echo "  PRIMARY_MODEL=$PRIMARY_MODEL"
echo "  Remote Control UI: $REMOTE"
echo ""

if [[ "$DRY_RUN" == false && "$YES" == false ]]; then
  if ! confirm "Install OpenClaw and write config to ~/.openclaw?"; then
    echo "Aborted."
    exit 0
  fi
fi

# 1. Install OpenClaw globally
echo ""
echo "--- Installing OpenClaw (npm global) ---"
run npm install -g openclaw@latest

# 2. Create config directory
OPENCLAW_DIR="$HOME/.openclaw"
CONFIG_FILE="$OPENCLAW_DIR/openclaw.json"
if [[ "$DRY_RUN" == false ]]; then
  mkdir -p "$OPENCLAW_DIR"
  if [[ -f "$CONFIG_FILE" ]]; then
    backup="$CONFIG_FILE.bak.$(date +%Y%m%d%H%M%S)"
    echo "Backing up existing config to $backup"
    cp -a "$CONFIG_FILE" "$backup"
  fi
fi

# 3. Write openclaw.json (minimal Ollama + default agent)
#    - Provider: api "ollama", baseUrl without /v1
#    - Models: explicit api "ollama" to avoid "No API provider for api: undefined"
#    - Agent id "default" so Control UI works
echo ""
echo "--- Writing OpenClaw config ---"
if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] Would write $CONFIG_FILE with Ollama provider and default agent"
else
  # Strip /v1 from base URL (Ollama native API)
  OLLAMA_BASE_CLEAN="${OLLAMA_BASE_URL%/}"
  OLLAMA_BASE_CLEAN="${OLLAMA_BASE_CLEAN%/v1}"

  if [[ "$REMOTE" == true ]]; then
    GATEWAY_JSON='{ "mode": "local", "bind": "lan", "controlUi": { "dangerouslyAllowHostHeaderOriginFallback": true } }'
  else
    GATEWAY_JSON='{ "mode": "local", "bind": "loopback" }'
  fi

  cat > "$CONFIG_FILE" << EOF
{
  "gateway": $GATEWAY_JSON,
  "models": {
    "providers": {
      "ollama": {
        "api": "ollama",
        "baseUrl": "$OLLAMA_BASE_CLEAN",
        "apiKey": "ollama-local",
        "models": [
          { "id": "llama3.2:3b", "name": "Llama 3.2 3B", "api": "ollama", "reasoning": false, "input": ["text"], "contextWindow": 131072, "maxTokens": 8192 },
          { "id": "llama3.1:8b", "name": "Llama 3.1 8B", "api": "ollama", "reasoning": false, "input": ["text"], "contextWindow": 131072, "maxTokens": 16384 }
        ]
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "default",
        "primaryModel": "$PRIMARY_MODEL",
        "identity": {
          "name": "OpenClaw",
          "theme": "Helpful assistant connected to local Ollama."
        }
      }
    ]
  }
}
EOF
fi

# 4. Run doctor (fix permissions, etc.)
echo ""
echo "--- Running openclaw doctor --fix ---"
if command -v openclaw &>/dev/null && [[ "$DRY_RUN" == false ]]; then
  run openclaw doctor --fix || true
fi

echo ""
echo "Done. Next steps:"
echo "  1. Ensure Ollama is running: curl -s $OLLAMA_BASE_URL/api/tags"
echo "  2. Start the gateway: openclaw gateway"
echo "  3. Open Control UI: https://127.0.0.1:18789 (or https://<this-host>:18789 if you used --remote)"
echo ""
echo "To add more Ollama models, edit models.providers.ollama.models in ~/.openclaw/openclaw.json"
echo "and set agents.list[0].primaryModel to e.g. ollama/llama3.1:8b"
