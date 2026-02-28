#!/usr/bin/env bash
# Shrink OpenClaw prompt for faster Ollama responses.
# Edits ~/.openclaw/openclaw.json: minimal identity, short system prompt, disable memory search.
# Run on the Mac: bash shrink-openclaw-prompt.sh [--dry-run] [--yes]

set -e

OPENCLAW_JSON="${OPENCLAW_JSON:-$HOME/.openclaw/openclaw.json}"
DRY_RUN=false
YES=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --yes)     YES=true ;;
  esac
done

MINIMAL_IDENTITY='{"name":"OpenClaw","theme":"Helpful assistant."}'
SHORT_SYSTEM_PROMPT="Greet briefly in 1-2 sentences if new session. Then help with the user's request."

echo "=== Shrink OpenClaw prompt ==="
echo "  Config: $OPENCLAW_JSON"
echo ""

if [[ ! -f "$OPENCLAW_JSON" ]]; then
  echo "Error: Config not found: $OPENCLAW_JSON"
  exit 1
fi

if [[ "$YES" != true ]]; then
  echo -n "Back up and modify openclaw.json? (y/N): "
  read -r answer
  [[ "$answer" == [yY] || "$answer" == [yY][eE][sS] ]] || { echo "Aborted."; exit 0; }
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] Would backup and apply minimal identity, short system prompt, memorySearch disabled"
  exit 0
fi

# Backup
backup="${OPENCLAW_JSON}.bak.$(date +%Y%m%d%H%M%S)"
cp -a "$OPENCLAW_JSON" "$backup"
echo "Backed up to $backup"

# Modify with Node (preserves other keys, only touches identity / systemPrompt / memorySearch)
export OPENCLAW_JSON SHORT_SYSTEM_PROMPT
node -e '
const fs = require("fs");
const path = process.env.OPENCLAW_JSON;
const shortSystemPrompt = process.env.SHORT_SYSTEM_PROMPT || "Greet briefly in 1-2 sentences if new session. Then help with the user'\''s request.";
const minimalIdentity = { name: "OpenClaw", theme: "Helpful assistant." };

let config;
try {
  config = JSON.parse(fs.readFileSync(path, "utf8"));
} catch (e) {
  console.error("Failed to parse JSON:", e.message);
  process.exit(1);
}

function applyToAgent(agent, isDefaults) {
  if (!agent) return;
  if (!isDefaults) agent.identity = minimalIdentity;
  if (agent.systemPrompt !== undefined) agent.systemPrompt = shortSystemPrompt;
  if (agent.memorySearch && typeof agent.memorySearch === "object") agent.memorySearch.enabled = false;
}

if (config.agents) {
  if (config.agents.defaults) applyToAgent(config.agents.defaults, true);
  if (Array.isArray(config.agents.list)) config.agents.list.forEach(function (a) { applyToAgent(a, false); });
}

fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log("Updated: identity (minimal), systemPrompt (short), memorySearch.enabled=false");
' 2>/dev/null || {
  echo "Node failed. Please edit $OPENCLAW_JSON manually. See OPENCLAW-MAC-MINI-TUNING.md"
  exit 1
}

echo "Done. Restart the gateway: openclaw gateway"
