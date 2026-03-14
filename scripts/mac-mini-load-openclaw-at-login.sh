#!/bin/bash
# Load Ollama and OpenClaw gateway LaunchAgents in the current (GUI) session
# so they keep running after SSH disconnects. Run at graphical login via the
# com.openclaw.load-at-login LaunchAgent.

set -e
AGENTS_DIR="${HOME}/Library/LaunchAgents"

# Edit these if your plist names differ. List yours with: ls ~/Library/LaunchAgents/
OLLAMA_PLIST="${AGENTS_DIR}/ollama.plist"
OPENCLAW_PLIST="${AGENTS_DIR}/com.openclaw.gateway.plist"

if [[ -f "${OLLAMA_PLIST}" ]]; then
  launchctl load "${OLLAMA_PLIST}" 2>/dev/null || true
fi
if [[ -f "${OPENCLAW_PLIST}" ]]; then
  launchctl load "${OPENCLAW_PLIST}" 2>/dev/null || true
fi
