# Load OpenClaw + Ollama at Mac mini graphical login

So the agent keeps running after SSH disconnects, load both LaunchAgents in the **graphical login session**. You can do that **from SSH** (no need to switch to the Mac) or set up auto-load at login.

---

## Option A: Load from SSH (no need to switch to the Mac)

If **someone has logged in at the Mac mini’s screen at least once** (so there is a “console” user), you can load the agents into that user’s session from SSH:

```bash
cd /path/to/cuphead-runner/scripts
chmod +x mac-mini-load-agents-remote.sh
./mac-mini-load-agents-remote.sh
```

That script uses `launchctl asuser <console-uid> launchctl load ...` so the agents run in the console user’s session and survive SSH disconnect. Edit the plist names at the top of the script if yours differ (`ollama.plist`, `com.openclaw.gateway.plist`).

**If you get “Could not determine console user”:** nobody is logged in at the Mac’s display. Log in once (or use Screen Sharing), then run the script again from SSH.

---

## Option B: Auto-load at every graphical login

### 1. On the Mac mini (SSH is fine for this part)

Create the OpenClaw config dir if needed and copy the loader script there:

```bash
mkdir -p ~/.openclaw
cp /path/to/cuphead-runner/scripts/mac-mini-load-openclaw-at-login.sh ~/.openclaw/load-agents-at-login.sh
chmod +x ~/.openclaw/load-agents-at-login.sh
```

Edit the script if your LaunchAgent plist names differ:

```bash
ls ~/Library/LaunchAgents/
```

Then open `~/.openclaw/load-agents-at-login.sh` and set `OLLAMA_PLIST` and `OPENCLAW_PLIST` to the full paths of your Ollama and OpenClaw gateway plists (script has defaults: `ollama.plist` and `com.openclaw.gateway.plist`).

### 2. Install the loader LaunchAgent

Copy the plist into your LaunchAgents (it will run the script above at every graphical login):

```bash
cp /path/to/cuphead-runner/scripts/com.openclaw.load-at-login.plist ~/Library/LaunchAgents/
```

Load the loader into the console user’s session (so it runs at login). From SSH you can do that with Option A’s trick:

```bash
CONSOLE_UID=$(id -u $(stat -f '%Su' /dev/console))
launchctl asuser $CONSOLE_UID launchctl load ~/Library/LaunchAgents/com.openclaw.load-at-login.plist
```

Or run it from the Mac’s screen / Screen Sharing: `launchctl load ~/Library/LaunchAgents/com.openclaw.load-at-login.plist`

After that, on every graphical login the loader runs and loads Ollama + OpenClaw gateway.

### 3. Test

1. Log out and log in again at the Mac (or reboot).
2. In Terminal on the Mac (or Screen Sharing), check that the agents are loaded:
   ```bash
   launchctl list | grep -E 'ollama|openclaw'
   ```
3. Disconnect SSH and use Slack/Discord; the agent should still respond.

## Logs

If something doesn’t load, check:

- `/tmp/openclaw-load-at-login.out.log`
- `/tmp/openclaw-load-at-login.err.log`

## Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.openclaw.load-at-login.plist
rm ~/Library/LaunchAgents/com.openclaw.load-at-login.plist
rm ~/.openclaw/load-agents-at-login.sh
```
