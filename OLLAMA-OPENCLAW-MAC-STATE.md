# Ollama + OpenClaw on Mac – Check current state

Run these on your **Mac mini** in Terminal to see what’s working. Copy-paste one block at a time.

---

## 1. Is Ollama running?

```bash
ollama list
```

- **If it works:** You see a table of installed models (e.g. `llama3.2`, `llama3.1`). Ollama is installed and the CLI can talk to the service.
- **If “command not found”:** Install Ollama from [ollama.com](https://ollama.com) (macOS app or `brew install ollama`).
- **If “connection refused” or similar:** Start Ollama (open the Ollama app from Applications, or run `ollama serve` in a terminal and leave it open).

---

## 2. Does the HTTP API work? (what OpenClaw uses)

**Quick check – list models via HTTP:**

```bash
curl -s http://localhost:11434/api/tags
```

- **If you get JSON** (list of models): Ollama’s HTTP API is up. Continue to step 3.
- **If “Connection refused”:** Ollama isn’t running or isn’t listening. Start the Ollama app or `ollama serve`.

**Optional – test a real chat request (takes 10–60 seconds):**

From this repo (if you have it on the Mac), or create a small script:

```bash
curl -s http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2","messages":[{"role":"user","content":"Say OK"}],"max_tokens":10,"stream":false}'
```

- **If you get JSON** with a `choices` array: the chat API works; OpenClaw should be able to use it.
- **If it hangs or errors:** Note the error; on Mac the HTTP API usually works, so this might be a model name issue (e.g. use a model you have from `ollama list`).

---

## 3. OpenClaw config on Mac

OpenClaw’s config file is:

```bash
~/.openclaw/openclaw.json
```

To see if it exists and what’s in it:

```bash
cat ~/.openclaw/openclaw.json
```

- **If the file doesn’t exist:** OpenClaw may be using defaults or another config path (check OpenClaw’s docs/settings).
- **If it exists:** Check that it points at Ollama, for example:
  - `baseUrl` or similar → `http://localhost:11434/v1`
  - `apiKey` → `ollama` (Ollama doesn’t need a real key)
  - Model set to something you have: `ollama list` shows the exact names (e.g. `llama3.2`).

---

## 4. Quick summary

| Check              | Command / location                    | OK if…                          |
|--------------------|---------------------------------------|----------------------------------|
| Ollama installed   | `ollama list`                         | You see a list of models         |
| Ollama HTTP API    | `curl -s http://localhost:11434/api/tags` | You get JSON with models     |
| OpenClaw config    | `cat ~/.openclaw/openclaw.json`      | File exists, baseUrl = localhost:11434 |

---

## 5. If something’s wrong

- **Ollama not running:** Open **Ollama** from Applications, or run `ollama serve` in Terminal and keep that window open.
- **No models:** Run `ollama pull llama3.2` (or another model name from [ollama.com/library](https://ollama.com/library)).
- **OpenClaw still “connection error”:**  
  1) Warm the model first: `ollama run llama3.2` → type "hi" → wait for reply, leave that terminal open.  
  2) In OpenClaw, start a **new chat** and try again; first reply can take 1–2 minutes on CPU.  
  3) In OpenClaw settings, set the Ollama endpoint to `http://localhost:11434/v1` and model to the exact name from `ollama list`.

On macOS, Ollama’s HTTP API is generally reliable (unlike some Windows setups), so once `curl http://localhost:11434/api/tags` works and OpenClaw is pointed at `http://localhost:11434/v1`, OpenClaw should be able to talk to Ollama. If you run through these steps and paste the outputs (or say which step fails), we can narrow it down further.
