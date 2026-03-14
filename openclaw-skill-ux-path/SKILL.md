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

Use for automated checks unless the user provides other credentials.

- **Email:** `user1@path.local`
- **Password:** `path123`

Additional seeded users: `user2@path.local` … `user100@path.local` (same password).

## Behavior

- **Act first.** When asked to do a web check or test, do it immediately. Do not ask "Shall we proceed?" or list steps and wait for confirmation.
- **Summarize.** After using the browser, report in a short summary (e.g. "Login page loads; title is FamApp"). Do not paste raw HTML, concatenated scraped text, or long snippets.
- **Use refs.** Prefer `browser_snapshot` then act (click, type) using element refs. Note bugs, freezes, confusing UX, or HTTP errors briefly.

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
