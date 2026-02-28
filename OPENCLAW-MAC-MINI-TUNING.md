# OpenClaw tuning for Mac mini (Ollama)

Settings to make OpenClaw faster and more reliable when running with local Ollama on a Mac mini. Edit **`~/.openclaw/openclaw.json`** on the Mac.

---

## 1. Keep the system prompt small

Large system prompts (identity, instructions, skills) make every request slow because Ollama has to process all of it.

- **Short identity:** In `agents.list[0].identity` (or `agents.defaults`), use a brief `name` and `theme` (one sentence). Avoid long instruction blocks.
- **Fewer skills:** Disable or remove skills you don’t need. Each skill adds text to the prompt.
- **No huge instructions:** If you have custom system text, trim it to the minimum.

Example minimal identity:

```json
"identity": {
  "name": "OpenClaw",
  "theme": "Helpful assistant."
}
```

---

## 2. Tune compaction (fewer tokens over time)

Compaction summarizes/trims history. Tuning it reduces how often it runs and keeps context smaller so requests stay fast.

Under **`agents.defaults`** (or your agent in `agents.list[0]`), add or adjust:

```json
"compaction": {
  "mode": "safeguard",
  "maxHistoryShare": 0.5,
  "reserveTokensFloor": 20000
}
```

- **maxHistoryShare: 0.5** – use at most 50% of context for history (rest for system + reply).
- **reserveTokensFloor: 20000** – keep a smaller reserve so compaction runs earlier and context stays smaller.

(On OpenClaw 2026.2.14+, compaction can abort runs; if you see “compaction wait aborted”, use **2026.2.13** or wait for a fix.)

---

## 3. Use a smaller/faster model

On a Mac mini, smaller models give quicker replies and are less likely to hit timeouts.

- Prefer **3B** (e.g. `llama3.2:3b`) for a balance of speed and quality.
- For maximum speed, use **1B** if available (e.g. `llama3.2:1b`).

Set the default model:

```bash
openclaw config set agents.defaults.model.primary "ollama/llama3.2:3b"
```

Or in JSON:

```json
"agents": {
  "defaults": {
    "model": {
      "primary": "ollama/llama3.2:3b"
    }
  }
}
```

Use a 1B model name if you pulled one with `ollama pull`.

---

## 4. Limit conversation history (optional)

Some OpenClaw configs let you cap how many prior turns are sent. If your version supports it, limiting history (e.g. last 5–10 exchanges) keeps prompts smaller and responses faster. Check the docs for your version for keys like `maxTurns` or `historyLimit`.

---

## 5. Ollama provider (correct and minimal)

Under **`models.providers.ollama`** keep it simple so OpenClaw talks to Ollama without extra overhead:

```json
"ollama": {
  "api": "ollama",
  "baseUrl": "http://127.0.0.1:11434",
  "apiKey": "ollama-local",
  "models": [
    { "id": "llama3.2:3b", "name": "Llama 3.2 3B", "api": "ollama", "reasoning": false, "input": ["text"], "contextWindow": 131072, "maxTokens": 4096 }
  ]
}
```

- **baseUrl** with no `/v1` (native Ollama API).
- **maxTokens: 4096** (or 2048) so replies don’t run too long and slow things down.
- Only list models you actually use so config stays clean.

---

## 6. Disable memory search if you don’t need it

If you’re not using semantic memory, disable it so OpenClaw doesn’t add embedding lookups or extra context:

```json
"agents": {
  "defaults": {
    "memorySearch": { "enabled": false }
  }
}
```

(Exact key may vary; check `openclaw config` or docs.)

---

## 7. Run a stable OpenClaw version

On Mac mini with Ollama, **2026.2.13** is a known-good version (avoids the compaction-abort issue in 2026.2.14+):

```bash
npm install -g openclaw@2026.2.13
```

Restart the gateway after changing config or version.

---

## Quick checklist

| Item | Purpose |
|------|--------|
| Short system prompt / identity | Faster requests, fewer tokens |
| Compaction tuning | Smaller context, less slowdown over time |
| Model: 3B or 1B | Quicker replies on Mac mini |
| Ollama baseUrl, no /v1 | Correct, fast connection to Ollama |
| maxTokens 2048–4096 | Avoid very long generations |
| memorySearch disabled | Fewer tokens and no embedding calls if not needed |
| OpenClaw 2026.2.13 | Avoid compaction abort; run completes and reply can reach UI |

After editing **`~/.openclaw/openclaw.json`**, restart the gateway: `openclaw gateway`.
