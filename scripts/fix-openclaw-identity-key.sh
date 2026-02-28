#!/usr/bin/env bash
# Remove "identity" from agents.defaults so OpenClaw accepts the config.
# (identity belongs only under agents.list[].)
# Run on the Mac: bash fix-openclaw-identity-key.sh

set -e
CONFIG="${OPENCLAW_JSON:-$HOME/.openclaw/openclaw.json}"

if [[ ! -f "$CONFIG" ]]; then
  echo "Config not found: $CONFIG"
  exit 1
fi

cp -a "$CONFIG" "${CONFIG}.bak.$(date +%Y%m%d%H%M%S)"
export CONFIG
node -e '
const fs = require("fs");
const path = process.env.CONFIG;
let config = JSON.parse(fs.readFileSync(path, "utf8"));
if (config.agents && config.agents.defaults && config.agents.defaults.identity !== undefined) {
  delete config.agents.defaults.identity;
  fs.writeFileSync(path, JSON.stringify(config, null, 2));
  console.log("Removed agents.defaults.identity. Restart gateway: openclaw gateway");
} else {
  console.log("No agents.defaults.identity found; config already valid.");
}
'
