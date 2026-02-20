# Run Ollama inside WSL2 (for OpenClaw on Windows)

This lets you use Ollama’s HTTP API from Windows so OpenClaw can talk to it. Many users see the API work reliably in WSL2 when it hangs on native Windows.

---

## 0. Install WSL2 + Ubuntu (required once)

You have WSL installed but need a **Linux distribution** (e.g. Ubuntu) to run the script.

1. **Install Ubuntu:** Open **PowerShell** or **Command Prompt** and run:
   ```powershell
   wsl --install Ubuntu
   ```
   (If Ubuntu is already installed, skip to step 2.)

2. **First time only:** Open **Ubuntu** from the Start menu. You’ll be asked to create a **username** and **password** for Linux. Remember them; you’ll need the password for `sudo` in the script.

3. **Check:** In PowerShell run `wsl --list --verbose`. You should see **Ubuntu** with **VERSION 2**. Then continue with step 1 below.

---

## 1. Install and run Ollama inside WSL2

1. Open your WSL2 terminal (e.g. **Ubuntu** from the Start menu).

2. Go to your project folder inside WSL. If your project is at `C:\Users\rodri\cuphead-runner` in Windows, in WSL it’s usually:
   ```bash
   cd /mnt/c/Users/rodri/cuphead-runner/wsl2-ollama
   ```

3. Run the install script:
   ```bash
   bash install-ollama-wsl2.sh
   ```
   - It will install Ollama, pull `llama3.2`, then start `ollama serve` with `OLLAMA_HOST=0.0.0.0` so it listens on all interfaces.
   - **Leave this terminal open** while you use OpenClaw.

4. First run can take a few minutes (download + model pull). When you see the server running (no error), continue.

## 2. Connect from Windows

Recent Windows 11 / WSL2 often forwards **localhost** into WSL2. So from Windows, `http://localhost:11434` may already reach Ollama in WSL2.

**Test from Windows (PowerShell):**

```powershell
Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get
```

If you get JSON with a list of models, you’re good. OpenClaw is already set to `http://localhost:11434/v1`, so it should work.

**If that fails:** WSL2’s IP can be used instead. In WSL2 run `hostname -I | awk '{print $1}'` and note the IP (e.g. `172.20.139.123`). In `C:\Users\rodri\.openclaw\openclaw.json`, change the Ollama `baseUrl` to:

`http://<WSL2_IP>:11434/v1`

(e.g. `http://172.20.139.123:11434/v1`). Restart or reload OpenClaw. Note: this IP can change after reboot; if OpenClaw stops connecting, run `hostname -I` again and update the config.

## 3. Use OpenClaw

1. Keep the WSL2 terminal with `ollama serve` **running**.
2. In Windows, open OpenClaw and start a **new chat**.
3. Send a message (e.g. “hi”) and wait. The first reply may take 30–60 seconds.

## 4. Run Ollama in WSL2 automatically (optional)

To start Ollama in WSL2 without running the script by hand each time:

1. In WSL2, create a service override so Ollama listens on `0.0.0.0`:
   ```bash
   sudo mkdir -p /etc/systemd/system/ollama.service.d
   echo '[Service]
   Environment="OLLAMA_HOST=0.0.0.0"' | sudo tee /etc/systemd/system/ollama.service.d/override.conf
   sudo systemctl daemon-reload
   sudo systemctl enable ollama
   sudo systemctl start ollama
   ```

2. Then you don’t need to keep a terminal open; Ollama will start when WSL2 boots (e.g. when you first open Ubuntu). You can still run `ollama pull llama3.2` and `ollama run llama3.2` in WSL2 when needed.

## Troubleshooting

- **“Connection refused” or timeout from Windows**  
  - Ensure the WSL2 terminal with `ollama serve` is still open (or the `ollama` service is running in WSL2).  
  - Try the WSL2 IP in `baseUrl` (see step 2 above).

- **Ollama not found in WSL2**  
  - Run the install script again: `bash install-ollama-wsl2.sh` (it will reinstall and then start the server).

- **Port 11434 in use**  
  - Stop the **Windows** Ollama app (tray icon → Quit) so only the WSL2 instance uses 11434.
