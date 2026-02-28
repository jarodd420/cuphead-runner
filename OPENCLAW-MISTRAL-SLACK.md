# Switch Slack agent from Anthropic to Mistral

Use this when the Slack agent is currently on Claude (Anthropic) and you want to use Mistral instead (e.g. no Anthropic credits). Config lives on the **Mac mini** at `~/.openclaw/openclaw.json`.

---

## Changes in `openclaw.json`

Summary of what to edit (paths and values only; your file may have more keys).

**1. Agent model (required)**  
In `agents.list`, find the Slack agent (e.g. `"id": "claude"`) and change its model:

```diff
  "agents": {
    "list": [
      { "id": "default", "model": { "primary": "ollama/llama3.2:1b" }, ... },
      {
        "id": "claude",
-       "model": { "primary": "anthropic/claude-3-haiku-20240307" },
+       "model": { "primary": "mistral/mistral-small-latest" },
        ...
      }
    ]
  }
```

**2. Mistral API key (required)**  
Either set `MISTRAL_API_KEY` in the environment (see step 2 below) or add/merge in the root of `openclaw.json`:

```diff
  {
+   "env": {
+     "MISTRAL_API_KEY": "sk-your-key-here"
+   },
    "gateway": { ... },
    "agents": { ... },
    ...
  }
```

(If `"env"` already exists, add only `"MISTRAL_API_KEY": "sk-..."` inside it.)

**3. Optional – remove Anthropic provider**  
If you no longer use Anthropic, you can delete the `anthropic` block under `models.providers`:

```diff
  "models": {
    "providers": {
      "ollama": { "api": "ollama", "baseUrl": "http://127.0.0.1:11434", ... },
-     "anthropic": {
-       "api": "anthropic-messages",
-       "baseUrl": "https://api.anthropic.com",
-       "apiKey": "env:ANTHROPIC_API_KEY",
-       ...
-     }
    }
  }
```

**No change needed:** `bindings` (e.g. `"agentId": "claude"`) stay as they are; only the agent’s model is switched to Mistral.

---

## 1. Get a Mistral API key

1. Go to [console.mistral.ai](https://console.mistral.ai).
2. Sign up or log in.
3. Create an API key (e.g. **API Keys** → **Create new key**).
4. Copy the key (starts with `sk-...`).

---

## 2. Make the API key available to OpenClaw

Pick one:

**Option A – Environment variable (recommended)**  
On the Mac, set `MISTRAL_API_KEY` so the gateway process sees it:

- If you start the gateway manually:  
  `export MISTRAL_API_KEY="sk-your-key"`  
  then run `openclaw gateway`.
- If the gateway runs as a service (e.g. LaunchAgent): add to the plist’s `EnvironmentVariables`:  
  `MISTRAL_API_KEY` = `sk-your-key`.

**Option B – In config**  
In `~/.openclaw/openclaw.json`, ensure there is an `env` object and add the key:

```json
"env": {
  "MISTRAL_API_KEY": "sk-your-key-here"
}
```

(Only do this if the file is not committed to git and you’re okay storing the key in the config.)

---

## 3. Point the Slack agent at Mistral

Edit `~/.openclaw/openclaw.json` on the Mac.

**3a. Change the agent’s model**

In `agents.list`, find the agent that is bound to Slack (e.g. the one with `"id": "claude"`). Set its model to a Mistral model:

- **Before:**  
  `"model": { "primary": "anthropic/claude-3-haiku-20240307" }`
- **After:**  
  `"model": { "primary": "mistral/mistral-small-latest" }`

Other Mistral models you can use:

- `mistral/mistral-small-latest` – good balance of speed and cost
- `mistral/mistral-medium-latest`
- `mistral/mistral-large-latest` – most capable

**3b. Bindings**

Your binding likely looks like:

```json
"bindings": [
  { "match": { "channel": "slack" }, "agentId": "claude" }
]
```

You can keep `"agentId": "claude"`; only the **model** of that agent was changed to Mistral. No need to change the binding unless you add a separate agent (e.g. `"id": "mistral"`) and want Slack to use that instead.

---

## 4. Optional: remove Anthropic

If you’re fully off Anthropic:

- Remove or comment out the `anthropic` entry under `models.providers` (if present).
- You can leave the agent id as `"claude"`; it’s just a name. Or rename the agent to `"mistral"` and set the binding’s `agentId` to `"mistral"`.

---

## 5. Restart the gateway

After saving `openclaw.json`:

```bash
# If running in terminal: stop with Ctrl+C, then:
openclaw gateway
```

If the gateway runs as a service, restart that service so it reloads the config and env.

---

## Quick checklist

| Step | What to do |
|------|------------|
| Mistral API key | Create at console.mistral.ai, copy `sk-...` |
| Auth | Set `MISTRAL_API_KEY` (env or `env` in config) |
| Agent model | In `agents.list`, set Slack agent’s `model.primary` to `mistral/mistral-small-latest` (or another Mistral model) |
| Bindings | Leave `agentId` as is unless you added a new agent |
| Restart | Restart `openclaw gateway` (or the service) |

Mistral is a built-in OpenClaw provider; you do **not** need to add a `models.providers.mistral` block. Default base URL is `https://api.mistral.ai/v1`.
