#!/usr/bin/env bash
# Completely uninstall OpenClaw (gateway, CLI, config, state, LaunchAgents).
# Run on macOS: bash uninstall-openclaw.sh [--dry-run] [--yes]

set -e

DRY_RUN=false
YES=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --yes)     YES=true ;;
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

echo "=== OpenClaw complete uninstall ==="
echo ""

if [[ "$DRY_RUN" == false && "$YES" == false ]]; then
  if ! confirm "Remove OpenClaw and all local data?"; then
    echo "Aborted."
    exit 0
  fi
fi

# 1. Stop LaunchAgents
echo ""
echo "--- Stopping services ---"
for plist in ai.openclaw.gateway.plist bot.molt.gateway.plist; do
  path="$HOME/Library/LaunchAgents/$plist"
  if [[ -f "$path" ]]; then
    run launchctl bootout "gui/$(id -u)" "$path" 2>/dev/null || true
  fi
done
run pkill -f openclaw 2>/dev/null || true
sleep 1

# 2. OpenClaw uninstall (gateway + local data)
echo ""
echo "--- OpenClaw uninstall (gateway + data) ---"
if command -v openclaw &>/dev/null; then
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] openclaw uninstall --all --yes"
  else
    openclaw uninstall --all --yes
  fi
else
  echo "openclaw CLI not in PATH, skipping openclaw uninstall"
fi

# 3. Remove npm global package
echo ""
echo "--- Removing CLI (npm global) ---"
if command -v npm &>/dev/null && npm list -g openclaw &>/dev/null 2>&1; then
  run npm uninstall -g openclaw
else
  echo "openclaw not installed globally via npm, skipping"
fi

# 4. Delete config/state directories and plists
echo ""
echo "--- Removing config and state ---"
for dir in "$HOME/.openclaw" "$HOME/.clawdbot" "$HOME/.moltbot"; do
  if [[ -d "$dir" ]]; then
    run rm -rf "$dir"
  fi
done
for plist in ai.openclaw.gateway.plist bot.molt.gateway.plist; do
  path="$HOME/Library/LaunchAgents/$plist"
  if [[ -f "$path" ]]; then
    run rm -f "$path"
  fi
done

echo ""
echo "Done. Remember to revoke Slack/API keys and OAuth tokens in their respective dashboards if needed."
