# Ollama + OpenClaw diagnostic result

**Date:** 2026-02-17

## What was tested

1. **GET http://localhost:11434/api/tags** (list models)  
   - **Result:** Request completed (exit 0) but took ~22 seconds.  
   - **Conclusion:** Ollama is running and the server responds to simple GET requests (possibly slowly).

2. **POST http://localhost:11434/v1/chat/completions** (same as OpenClaw uses)  
   - **Result:** **TIMEOUT after 2 minutes** → "socket hang up".  
   - **Conclusion:** The inference endpoint **does not respond** within 2 minutes on your machine. OpenClaw will always hit a timeout or "Connection error" / "Request was aborted" when using Ollama.

## Root cause

Ollama’s **HTTP inference path** (POST to `/v1/chat/completions`) is not working on this Windows setup: the request never completes. This matches known issues with Ollama on Windows (HTTP API blocking or hanging during inference). The **CLI** (`ollama run llama3.2`) uses a different code path and can still work.

## What will not fix it (already tried)

- Updating Ollama  
- Changing baseUrl to localhost / 127.0.0.1  
- Changing apiKey  
- Increasing context window in config  
- Pre-warming the model in CLI  
- Removing invalid keys (stream, minContextWindow, main agent)

## Recommended fix: use the workaround

Until Ollama’s Windows HTTP API works reliably on your PC:

1. **Use OpenClaw with a cloud model** (e.g. Anthropic) as the primary model for chat. Configure it in OpenClaw and use it for normal conversations.
2. **Use Ollama only from the terminal** when you want local inference:  
   `ollama run llama3.2`  
   Then chat in that terminal.

This avoids the broken HTTP path and gives you both working OpenClaw chat and local Ollama.

## Optional: try WSL2

If you have **Windows Subsystem for Linux (WSL2)**:

- Install and run Ollama **inside** the WSL2 Linux environment.
- Many users see the HTTP API work there. OpenClaw on Windows can still use `http://localhost:11434/v1` if Ollama in WSL2 is bound to listen on all interfaces.

## Optional: check Ollama’s own log

To see if Ollama logs any errors when a request is sent:

- Open: `C:\Users\rodri\AppData\Local\Ollama\server.log`
- Trigger a request (e.g. run `node check-ollama-http.js` or send a message from OpenClaw).
- See if new errors or stack traces appear at the time of the request.

This won’t fix the hang but can confirm the request reaches Ollama and how it fails.
