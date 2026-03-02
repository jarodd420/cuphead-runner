# OpenClaw as UX tester for Path (Fam) app

Use your OpenClaw agent on the Mac mini to drive a real browser and test the Path app. You already have Playwright installed; follow these steps on the **Mac mini**.

---

## 1. Browser setup (no separate install)

OpenClaw has two browser modes. For a UX tester on the Mac mini, use the **managed browser** (no extension):

- **Managed profile (`openclaw`):** OpenClaw starts and controls its own browser. Snapshots and actions use **Playwright** when installed (you already have it). No `openclaw browser install` command exists—just enable the tool and, if needed, start the browser.
- **Chrome extension profile (`chrome`):** Uses your existing Chrome plus the "OpenClaw Browser Relay" extension; you attach tabs manually. Not required for UX testing.

Ensure Playwright is installed on the Mac mini (you said it is). Then either:

- Let the **agent** start the browser when it uses the `browser` tool (no manual step), or  
- Start it yourself for testing:  
  `openclaw browser start --profile openclaw`  
  Check status:  
  `openclaw browser status --json`  
  List tabs:  
  `openclaw browser tabs`

---

## 2. Enable the browser tool for your agent

Edit **`~/.openclaw/openclaw.json`** on the Mac mini.

- **Allow the browser tool**  
  Either do not deny it, or explicitly allow it:

```json
{
  "tools": {
    "allow": ["browser"]
  }
}
```

If you use a **tool profile**, include browser (e.g. `group:ui` or `browser`):

```json
{
  "tools": {
    "profile": "full"
  }
}
```

Or allow browser alongside other tools:

```json
{
  "tools": {
    "allow": ["group:fs", "browser"]
  }
}
```

- **Ensure browser is enabled** (it usually is by default):

```json
{
  "browser": {
    "enabled": true
  }
}
```

Optional: for visible debugging, use a headed browser and viewport:

```json
{
  "browser": {
    "enabled": true,
    "headless": false,
    "viewport": { "width": 390, "height": 844 }
  }
}
```

Restart the gateway after config changes:

```bash
openclaw gateway
```

---

## 3. Make the app reachable from the Mac mini

The agent must be able to open the app in the browser.

- **Same machine:** run the Path app on the Mac mini and use `http://localhost:3000` (or whatever port `npm start` uses).
- **Different machine:** run the app on your dev machine and expose it (e.g. ngrok, cloudflare tunnel, or local IP if both are on the same LAN), then use that URL (e.g. `https://abc123.ngrok.io`).

Example (Mac mini):

```bash
cd /path/to/cuphead-runner/path-app
npm install
npm run seed   # if needed
npm start      # leave running → http://localhost:3000
```

---

## 4. Persistently give the agent site URL and test account

**Option A: Config (theme)**  
In `openclaw-mac-mini-ux.json` the UX Tester agent’s `identity.theme` already includes the production URL, local URL, and test account (`user1@path.local` / `path123`). Copy that config to `~/.openclaw/openclaw.json` on the Mac so the agent always has that context.

**Option B: Skill file**  
OpenClaw loads skills from **directories** that contain a file named **`SKILL.md`** (not arbitrary .md files).

### Add the Path UX skill on the Mac mini

1. **Create the skill directory** (use one of these locations):

   ```bash
   # Workspace skills (often loaded first)
   mkdir -p ~/.openclaw/workspace/skills/ux-path-fam

   # Or shared/local skills
   mkdir -p ~/.openclaw/skills/ux-path-fam
   ```

2. **Copy the SKILL.md** from this repo into that directory:

   From your repo (after cloning or syncing to the Mac):

   ```bash
   cp /path/to/cuphead-runner/openclaw-skill-ux-path/SKILL.md ~/.openclaw/workspace/skills/ux-path-fam/
   ```

   Or create `~/.openclaw/workspace/skills/ux-path-fam/SKILL.md` and paste the contents from `openclaw-skill-ux-path/SKILL.md` (frontmatter + Path URL, test account, flows).

3. **Restart the gateway** so OpenClaw picks up the new skill:

   ```bash
   openclaw gateway
   ```

4. **Optional: skills allowlist**  
   If your config has `agents.list[].skillsAllowlist` (or similar), add the skill name so this agent gets it. The skill’s frontmatter has `name: ux_path_fam`, so you might need something like `"skillsAllowlist": ["ux_path_fam"]` for the UX agent. If you don’t use an allowlist, all skills in the loaded dirs are usually included.

### Verify the agent is using the skill

1. **Restart the gateway** after adding or changing the skill.
2. In Slack (or the control UI), start a **new chat** with the UX Tester agent.
3. Ask: *“What URL and test account do you use for Path app UX testing?”*  
   If the skill is loaded, the agent should reply with the production URL (or localhost) and `user1@path.local` / `path123` without you supplying them in that message.
4. Or ask: *“Do a quick Path app test.”*  
   It should open the correct site and sign in with the test account on its own.

If it doesn’t mention the right URL/account, check: skill is in `~/.openclaw/workspace/skills/ux-path-fam/SKILL.md` (or `~/.openclaw/skills/ux-path-fam/SKILL.md`), gateway was restarted, and the allowlist (if any) includes this skill for the UX agent.

---

## 5. Run a test from the OpenClaw UI

1. Start the Path app (so the base URL is reachable).
2. In OpenClaw, start a **new chat** with the agent that has the browser tool and the UX tester prompt.
3. Send a task, e.g.:
   - "Open the Path app, sign in as user1@path.local password path123, then test the contact card: open someone's contact card, tap their avatar to open the full image, then close and confirm you're back on the contact card."
   - "Do a quick UX pass on the feed: scroll, open a contact card, open full-screen image, close, and list any bugs or UX issues."

The agent will use the `browser` tool (navigate, snapshot, act for click/type, optionally screenshot) and reply with what it did and what it found.

---

## 6. Optional: viewport and mobile testing

To mimic mobile (where Path is tuned), set a mobile viewport in `openclaw.json` if your version supports it (e.g. `browser.viewport`). If that key is unrecognized, skip it. Use `headless: false` while debugging so you can watch the browser on the Mac mini.

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Playwright already installed on Mac mini; no `openclaw browser install` (command doesn't exist) |
| 2 | In `openclaw.json`: allow `browser` (e.g. `tools.allow: ["browser"]`), `browser.enabled: true`, optional `browser.defaultProfile: "openclaw"` |
| 3 | Run Path app on Mac mini (`npm start` in path-app) or expose it and note the URL |
| 4 | Set agent theme or skill with UX tester role, base URL, and test account |
| 5 | **Skill:** Copy `openclaw-skill-ux-path/SKILL.md` into `~/.openclaw/workspace/skills/ux-path-fam/` (or `~/.openclaw/skills/ux-path-fam/`), then restart gateway |
| 6 | Restart: `openclaw gateway` |
| 7 | Verify: new chat → ask “What URL and test account for Path UX testing?” → agent should answer from skill/theme |

If the agent does not get the browser tool, check that `tools.deny` does not include `browser` and that your agent's `tools` allow it (or use a profile that includes `group:ui` / `browser`).
