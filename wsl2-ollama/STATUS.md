# WSL2 Ollama – status

## Done

1. **Ubuntu (WSL2)** – installed and available.
2. **Ollama** – installed in WSL at `/usr/local/bin/ollama`.
3. **Ollama server** – running in WSL with `OLLAMA_HOST=0.0.0.0` (listening on port 11434).
4. **Windows → WSL** – `http://localhost:11434` from Windows reaches the Ollama server in WSL.

## In progress

- **Model `llama3.2`** – download was started in the background (~2 GB). It may still be pulling.

To check in WSL whether the model is ready:

```bash
wsl -d Ubuntu -e ollama list
```

If you see `llama3.2` in the list, the model is ready. If the list is empty, wait a few minutes and run the same command again.

To pull the model manually if needed:

```bash
wsl -d Ubuntu -e ollama pull llama3.2
```

## Next steps for you

1. **Use only one Ollama on 11434**  
   If the **Windows** Ollama app is running, quit it (tray icon → Quit) so only the WSL server uses port 11434.

2. **Wait for the model**  
   When `ollama list` in WSL shows `llama3.2`, continue.

3. **OpenClaw**  
   Your OpenClaw config already uses `http://localhost:11434/v1`.  
   - Start a **new chat** in OpenClaw.  
   - Send a message (e.g. “hi”).  
   - The first reply can take 30–60 seconds (model load).

4. **After reboot**  
   The Ollama server in WSL will not start by itself. To start it again:

   ```bash
   wsl -d Ubuntu -e bash -c "export OLLAMA_HOST=0.0.0.0 && nohup ollama serve > /tmp/ollama-serve.log 2>&1 &"
   ```

   Or open **Ubuntu**, run `OLLAMA_HOST=0.0.0.0 ollama serve`, and leave that window open.
