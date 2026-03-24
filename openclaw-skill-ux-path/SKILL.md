---
name: ux_path_fam
description: FamApp UX testing — URLs, test account, behavior, and test flows.
---

# FamApp testing

Use this skill when testing the FamApp (Path) app in the browser.

## URLs

| Environment | URL |
|-------------|-----|
| Production  | https://fam-production.up.railway.app/ |
| Local       | http://localhost:3000 |

## Test account

**Use only these credentials for FamApp testing.** Do not use or repeat any other email or password from the conversation or from memory.

- **Email:** `user1@path.local`
- **Password:** `path123`

Additional seeded users: `user2@path.local` … `user100@path.local` (same password).

## Behavior

- **Act first.** When asked to do a web check or test, do it immediately. Do not ask "Would you like me to retry?" or "Would you like me to provide more details?"—if a step (e.g. login) fails, retry it once (e.g. use browser_fill on email/password, then click Sign in), then report the outcome in one sentence. Give a short summary when done.
- **Multi-step flow.** Use the browser tool multiple times in one task: e.g. navigate → snapshot → log in (fill + click) → snapshot → scroll or open a contact card → snapshot → then reply with a summary. Do not send a reply after only one browser action (e.g. after just opening the page). Complete at least: open app, log in, and one post-login action, then summarize.
- **Summarize.** After using the browser, report in a short summary (e.g. "Login page loads; title is FamApp"). Do not paste raw HTML, concatenated scraped text, or long snippets.
- **Use refs.** Prefer `browser_snapshot` then act (click, type) using element refs. Note bugs, freezes, confusing UX, or HTTP errors briefly. Sign-in fields expose stable `data-testid` values (e.g. `login-email`, `login-password`, `login-submit`; signup has `signup-email`, etc.) for consistent automation after navigation.

## Test flows

1. **Basic web check** — Open the site; confirm login page loads and branding/title look correct.
2. **Login** — Sign in with the test account; confirm redirect to timeline.
3. **Timeline** — Scroll; open a contact card (tap avatar), open full-screen image, close back.
4. **Add moment** — Tap + (FAB), pick photo or video, optional text; submit.
5. **Profile** — Open profile; optionally update photo, cover, or bio if asked.
6. **Fams** — Open fams list; view/create fams; invite by email if testing that flow.

## Reporting

- Keep findings brief. If useful, write a short report to the workspace.
- To send recommendations to the kanban: POST to `https://fam-production.up.railway.app/api/openclaw-feedback` with `X-OpenClaw-Token` and JSON body (see OPENCLAW-FEEDBACK-API.md). No app login required for that.
