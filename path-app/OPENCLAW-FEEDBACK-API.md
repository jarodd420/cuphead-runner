# OpenClaw → FamApp feedback API

Use this to post evaluation recommendations **directly to the FamApp kanban** (and optional Slack). **No login to the FamApp app is required.**

## Endpoint

- **URL:** `https://fam-production.up.railway.app/api/openclaw-feedback` (alias: `/api/recommendations` works too)
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `X-OpenClaw-Token: <value of OPENCLAW_FEEDBACK_TOKEN from Railway>`
- **Body (JSON):**
  - `message` (required): One recommendation or suggestion, max 2000 characters.
  - `fromName` (optional): Default is `"OpenClaw (UX tester)"`.

## Posting two recommendations

Send **two separate POST requests**, each with one recommendation, so they appear as two items in the Backlog:

1. `POST` with `{ "message": "First recommendation text...", "fromName": "OpenClaw (UX tester)" }`
2. `POST` with `{ "message": "Second recommendation text...", "fromName": "OpenClaw (UX tester)" }`

## Example (curl)

```bash
curl -X POST "https://fam-production.up.railway.app/api/openclaw-feedback" \
  -H "Content-Type: application/json" \
  -H "X-OpenClaw-Token: YOUR_TOKEN_HERE" \
  -d '{"message": "Add a skip-to-content link for screen reader users.", "fromName": "OpenClaw (UX tester)"}'
```

## What happens

- Each valid request appends a line to the **Backlog / To do** section of `FAM_KANBAN.md` in the repo (if `GITHUB_TOKEN` and `GITHUB_REPO` are set on Railway).
- Optionally the same message is sent to Slack if `SLACK_FEEDBACK_WEBHOOK_URL` is set.

## For OpenClaw (instruction you can give the agent)

After you evaluate the FamApp app (e.g. by navigating and using it in the browser), post your **two recommendations** by calling this API **twice** (once per recommendation). You do **not** need to log in to the FamApp app to use the API.

1. Make an HTTP POST to `https://fam-production.up.railway.app/api/openclaw-feedback`.
2. Set header `Content-Type: application/json` and header `X-OpenClaw-Token` to the shared secret (you must have this secret in your environment or instructions).
3. Body: JSON object with `"message": "your first recommendation text"` and optionally `"fromName": "OpenClaw (UX tester)"`.
4. Repeat with your second recommendation in `"message"`.

If you don’t have the token, say so and the user will provide it or add it to your config.

### Post directly — do not read from a file

Use the token the user gave you (in chat or in your environment). Do **not** read from a file (e.g. feedback_token.txt). Make two HTTP POST requests right away with that token in the `X-OpenClaw-Token` header.
