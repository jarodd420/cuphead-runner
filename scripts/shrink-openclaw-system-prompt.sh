#!/usr/bin/env bash
# Find and shrink the source of systemPromptChars=27725 so Ollama gets small prompts.
# Run on the Mac: bash shrink-openclaw-system-prompt.sh [--dry-run] [--yes]

set -e

OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
CONFIG="${OPENCLAW_JSON:-$OPENCLAW_DIR/openclaw.json}"
AGENT_DIR="$OPENCLAW_DIR/agents/default"
WORKSPACE="$OPENCLAW_DIR/workspace"
DRY_RUN=false
YES=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --yes)     YES=true ;;
  esac
done

SHORT_PROMPT="You are a helpful assistant. Keep replies brief unless asked for more."

echo "=== Shrink OpenClaw system prompt (target: systemPromptChars << 27725) ==="
echo "  Config: $CONFIG"
echo "  Agent dir: $AGENT_DIR"
echo ""

if [[ "$YES" != true ]]; then
  echo -n "Back up and apply changes? (y/N): "
  read -r answer
  [[ "$answer" == [yY] || "$answer" == [yY][eE][sS] ]] || { echo "Aborted."; exit 0; }
fi

# 1. Find large text sources under agent and workspace
echo "--- Checking for large prompt sources ---"
for dir in "$AGENT_DIR" "$WORKSPACE"; do
  [[ -d "$dir" ]] || continue
  find "$dir" -type f \( -name "*.md" -o -name "*.txt" -o -name "*.json" \) 2>/dev/null | while read -r f; do
    len=$(wc -c < "$f" 2>/dev/null || echo 0)
    if [[ -n "$len" && "$len" -gt 500 ]]; then
      echo "  Large file ($len chars): $f"
    fi
  done
done

# 2. Backup and set minimal systemPrompt in config
if [[ -f "$CONFIG" ]]; then
  if [[ "$DRY_RUN" != true ]]; then
    cp -a "$CONFIG" "${CONFIG}.bak.$(date +%Y%m%d%H%M%S)"
  fi
  export CONFIG SHORT_PROMPT DRY_RUN
  node -e '
    const fs = require("fs");
    const path = process.env.CONFIG;
    const short = process.env.SHORT_PROMPT;
    const dryRun = process.env.DRY_RUN === "true";
    let c = JSON.parse(fs.readFileSync(path, "utf8"));
    let changed = false;
    function setMinimal(agent) {
      if (!agent) return;
      if (agent.systemPrompt !== undefined && agent.systemPrompt !== short) {
        agent.systemPrompt = short;
        changed = true;
      }
    }
    if (c.agents) {
      if (c.agents.defaults) setMinimal(c.agents.defaults);
      if (Array.isArray(c.agents.list)) c.agents.list.forEach(setMinimal);
    }
    if (changed && !dryRun) fs.writeFileSync(path, JSON.stringify(c, null, 2));
    if (changed) console.log("Config: set systemPrompt to 1 short line");
  '
fi

# 3. Rename common "system prompt" / instruction files so they are not loaded (backup)
for name in system-prompt.md instructions.md system.md identity.md prompt.md; do
  for dir in "$AGENT_DIR" "$AGENT_DIR/agent" "$WORKSPACE"; do
    f="$dir/$name"
    if [[ -f "$f" ]]; then
      len=$(wc -c < "$f" 2>/dev/null)
      echo "  Found ($len chars): $f"
      if [[ "$DRY_RUN" != true ]]; then
        mv "$f" "${f}.bak.$(date +%Y%m%d%H%M%S)"
        echo "  Renamed to .bak so OpenClaw does not load it"
      fi
    fi
  done
done

# 4. Skills: often the biggest source of system prompt text
echo ""
echo "--- Skills ---"
SKILLS_DIR="$WORKSPACE/skills"
if [[ -d "$SKILLS_DIR" ]]; then
  count=$(find "$SKILLS_DIR" -maxdepth 1 -type d 2>/dev/null | wc -l)
  echo "  Workspace skills dir has $count entries. Disabling skills will drop systemPromptChars a lot."
  echo "  To disable: in openclaw.json set agents.list[0].skillsAllowlist to [] or remove skills."
fi

echo ""
echo "Done. Restart gateway and send one message in a NEW chat, then run:"
echo "  grep context-diag /tmp/openclaw/openclaw-*.log | tail -1"
echo "  → systemPromptChars should be much lower (e.g. under 500)."
