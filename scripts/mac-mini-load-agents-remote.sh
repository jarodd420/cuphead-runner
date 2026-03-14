#!/bin/bash
# Run this over SSH to load Ollama and OpenClaw gateway into the *console user's*
# session so they keep running after SSH disconnects. No need to sit at the Mac.
# Requires: someone has logged in at the Mac mini's screen at least once (so
# there is a console user). Usage: ./mac-mini-load-agents-remote.sh

set -e

# Plist names under ~/Library/LaunchAgents/ (edit if yours differ)
OLLAMA_PLIST="ollama.plist"
OPENCLAW_PLIST="com.openclaw.gateway.plist"

CONSOLE_USER=$(stat -f '%Su' /dev/console 2>/dev/null || true)
if [[ -z "$CONSOLE_USER" || "$CONSOLE_USER" == "root" ]]; then
  echo "Could not determine console user (nobody logged in at the Mac's screen?)." >&2
  echo "Log in at the Mac mini once, or use Screen Sharing, then run this again." >&2
  exit 1
fi

CONSOLE_UID=$(id -u "$CONSOLE_USER")
AGENTS_DIR="/Users/$CONSOLE_USER/Library/LaunchAgents"

for plist in "$OLLAMA_PLIST" "$OPENCLAW_PLIST"; do
  path="$AGENTS_DIR/$plist"
  if [[ -f "$path" ]]; then
    echo "Loading $plist into session of $CONSOLE_USER (uid $CONSOLE_UID)..."
    launchctl asuser "$CONSOLE_UID" launchctl load "$path" 2>/dev/null || true
  fi
done

echo "Done. Agents should now run in $CONSOLE_USER's session and survive SSH disconnect."
