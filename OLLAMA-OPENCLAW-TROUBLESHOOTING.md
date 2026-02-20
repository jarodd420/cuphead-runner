# Ollama + OpenClaw on Windows – Troubleshooting

## What to do to fix it (in order)

1. **Update Ollama**  
   Install the latest from [ollama.com](https://ollama.com). Newer builds often fix Windows HTTP issues. Restart Ollama after updating.

2. **Warm the model, then use OpenClaw**  
   - Open a terminal and run: `ollama run llama3.2`  
   - Send **hi** and wait for a reply (model is loaded in RAM).  
   - **Leave that terminal open** (don’t exit).  
   - In OpenClaw, start a **new chat** and send one message. Wait 1–2 minutes.  
   Sometimes the first HTTP request (model load) hangs; warming via CLI can avoid that.

3. **Use a new chat and wait longer**  
   In OpenClaw, start a **new conversation** (not the long one with compaction). Send **hi** and wait at least **1–2 minutes** before giving up. First reply on CPU can be slow.

4. **Check Ollama’s log**  
   - Open `%LOCALAPPDATA%\Ollama\server.log` in Notepad (e.g. `C:\Users\rodri\AppData\Local\Ollama\server.log`).  
   - Try OpenClaw again and see if the log shows errors when you send a message.  
   - Optional: run `ollama serve` in PowerShell (with the app closed) and watch the console while you use OpenClaw.

5. **If it still never works: use a workaround**  
   - Use **OpenClaw with a cloud model** (e.g. Anthropic) for chat.  
   - Use **Ollama only in the terminal** (`ollama run llama3.2`) for local chat.  
   This avoids the broken HTTP path until Ollama fixes Windows inference.

6. **Optional: try WSL2**  
   If you use Windows Subsystem for Linux, install Ollama inside WSL2. Many people see the HTTP API work reliably there; OpenClaw on Windows can still point at `http://localhost:11434/v1` if Ollama in WSL2 is set to listen on all interfaces.

### After upgrading Ollama

If you upgraded Ollama and OpenClaw still never gets a response:

1. **Check if the HTTP API works at all**  
   In your project folder run:
   ```bash
   node check-ollama-http.js
   ```
   - If you see **Status: 200** and a short reply: the API works; the problem may be OpenClaw (e.g. timeout or UI). Try a **new chat** and wait 2+ minutes.
   - If you see **TIMEOUT** or **Error**: the upgrade didn’t fix the Windows HTTP path. Use the workaround below.

2. **Use the workaround**  
   Rely on **OpenClaw with a cloud model** (e.g. Anthropic) for chat, and **Ollama only in the terminal** (`ollama run llama3.2`) for local use. Many Windows users have to do this until Ollama improves the HTTP server on Windows.

---

## What we found

- **Ollama CLI** (`ollama run llama3.2` → "hi") works.
- **Ollama HTTP API** (what OpenClaw uses) does **not** respond in time:
  - `GET http://127.0.0.1:11434/api/tags` works (list models).
  - `POST http://127.0.0.1:11434/v1/chat/completions` and `POST .../api/chat` **time out** (60–90+ seconds, then "socket hang up").
- So OpenClaw gets **"Connection error"** because the HTTP request to Ollama never completes.

This matches known issues: on Windows, Ollama’s HTTP inference can hang or be very slow (see e.g. [ollama/ollama#3552](https://github.com/ollama/ollama/issues/3552), [ollama/ollama#2529](https://github.com/ollama/ollama/issues/2529)).

## Config changes already applied

In `C:\Users\rodri\.openclaw\openclaw.json`:

1. **baseUrl** → `http://localhost:11434/v1`
2. **apiKey** → `ollama`
3. **stream** → `false` (avoids “infinite typing” when local models don’t stream tool calls correctly)
4. **contextWindow** for `ollama/llama3.2` → `65536` (64k; OpenClaw works better with a larger reported context)

If the gateway reports an “Unrecognized key” for `stream`, remove that line from the config.

---

## Top fixes from the community (Ollama + OpenClaw)

These often help with hangs and “no response”:

1. **Increase Ollama’s context length**  
   OpenClaw expects a large context window. Run your model with a bigger context:
   - **CLI:** `ollama run llama3.2 --ctx 65536`
   - **Or** set before starting Ollama (e.g. in System Properties → Environment Variables, or in a terminal):  
     `set OLLAMA_CONTEXT_LENGTH=65536`  
     Then start Ollama and use OpenClaw.  
   (Llama 3.2 may not support full 64k; use 8192 or 16384 if 65536 isn’t supported.)

2. **Disable streaming**  
   Already set in your config: `"stream": false` under the `ollama` provider. Reduces “infinite typing” and parser issues with tool calls.

3. **Verify endpoint**  
   In a browser or terminal: `curl http://localhost:11434/api/tags` (or PowerShell: `Invoke-RestMethod http://localhost:11434/api/tags`).  
   If that fails, try setting `OLLAMA_HOST=0.0.0.0` in your environment so Ollama listens on all interfaces, then use `http://localhost:11434/v1` in OpenClaw.

4. **Pre-warm the model**  
   Before using OpenClaw, run `ollama run llama3.2 "hello"` (or send one message in the CLI and get a reply), then leave that session open and start your OpenClaw chat. This avoids the first HTTP request having to load the model and hit timeouts.

## If it still doesn’t work

1. **Ollama version**  
   Update to the latest from [ollama.com](https://ollama.com).

2. **Ollama logs**  
   - Log file: `%LOCALAPPDATA%\Ollama\server.log`  
   - In PowerShell: `$env:OLLAMA_DEBUG="1"; ollama serve` (then try a request and watch the console).

3. **Warm model first**  
   In a terminal run `ollama run llama3.2`, send "hi", get a reply, then **leave that session open** and try OpenClaw chat. If the first HTTP request is “load model”, warming via CLI might help.

4. **Workaround**  
   Use OpenClaw with a **cloud model** (e.g. Anthropic) for chat, and use **Ollama only via CLI** until Ollama’s Windows HTTP inference is fixed or faster on your setup.
