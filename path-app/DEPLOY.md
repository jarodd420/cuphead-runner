# Deploying Fam at scale

The app supports two backends:

- **JSON files** (default): no env vars. Data lives in `data/*.json`. Good for local dev.
- **PostgreSQL + optional image storage**: set env vars below for production.

---

## Host on the internet

**No credit card?** Use **[Railway + Supabase](#option-b-railway--supabase-no-card-for-signup-railway-has-limited-free-credit)** (or Option A) below — sign up with GitHub, no payment info required.

---

### Render Blueprint (one-click, but requires payment information)

The repo includes a **Blueprint** so you can go from localhost to a live URL in a few minutes. **Render typically requires a credit card on file** to use Blueprints (even for free tier).

1. **Push your code** (including `render.yaml` at the **repo root**) to GitHub, GitLab, or Bitbucket.

2. **Sign in at [Render](https://render.com)** and connect the same repo.

3. **New → Blueprint**. Select the repo. Render will detect `render.yaml` at the root.

4. **Apply** (or **Create resources**). Render will:
   - Create a **PostgreSQL** database (`fam-db`).
   - Create a **Web Service** for the Fam app (root directory: `path-app`).
   - Run **schema** on first deploy (`npm run schema`), so tables and session store are created automatically.
   - Set `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`, and `USE_HTTPS` for you.

5. After the first deploy finishes, open the service URL (e.g. `https://fam-xxxx.onrender.com`). Sign up with a new account and create a fam to start using the app.

**Optional:** To enable image uploads (profile/moment photos) instead of base64, add [Supabase Storage](https://supabase.com) and set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (and optionally `SUPABASE_STORAGE_BUCKET`) in the Render service **Environment** tab. See section 2 below.

**Note:** On the free tier the service may spin down when idle; the first request after idle can take a minute to respond.

**If you don’t want to add a card:** Use the options in the next section (Railway + Supabase, or Railway + Render’s Postgres) — no payment info required to sign up.

---

## No credit card required

### Option A: Railway (no card, then ~$1/month free credit)

1. Sign up at [Railway](https://railway.app) with GitHub (no credit card).
2. **New Project** → **Deploy from GitHub** → select this repo.
3. Set **Root Directory** to `path-app`. Add a **PostgreSQL** plugin (same project).
4. In the web service, set env vars: **Variables** → add `DATABASE_URL` (use “Add reference” and pick the Postgres `DATABASE_URL`), `SESSION_SECRET` (generate a long random string), `NODE_ENV=production`, `USE_HTTPS=1`.
5. **Settings** → **Build**: Build Command `npm install`, Start Command `npm start`. Add a **Deploy** hook or run once manually: in a shell with `DATABASE_URL` set, from `path-app` run `npm run schema`.
6. Deploy. Railway gives a small free trial; after that you get about $1/month free credit (usage beyond that would need a card).

### Option B: Railway + Supabase (no card for signup; Railway has limited free credit)

1. Create a free [Supabase](https://supabase.com) project, run `path-app/db/schema.sql` in SQL Editor, copy the **Database** → **Connection string (URI)** (Session pooler, port 6543).
2. Sign up at [Railway](https://railway.app) with GitHub (no credit card). **New Project** → **Deploy from GitHub** → select this repo.
3. Set **Root Directory** to `path-app`. In **Variables** add: `DATABASE_URL` (your Supabase URI), `SESSION_SECRET` (long random string), `NODE_ENV=production`, `USE_HTTPS=1`.
4. **Settings** → Build: `npm install`, Start: `npm start`. Deploy; then in a one-off shell (or locally with `DATABASE_URL` set) run `npm run schema` from `path-app` if tables don’t exist yet.
5. Use the Railway-generated URL. No credit card needed to start; Railway gives limited free credit per month.

**Migrating from Glitch:** Keep your existing Supabase project. Deploy the same repo to Render or Railway and set `DATABASE_URL` to your current Supabase connection string. Your data stays in Supabase; only the app host changes.

**Railway + Supabase: `ENETUNREACH` or connection refused**  
Railway’s network may not reach Supabase’s **direct** DB (port 5432, sometimes over IPv6). Use the **Session pooler** URL instead: in Supabase → **Project Settings** → **Database** → **Connection string** → pick **URI** and the **Session** (port **6543**) option. It should look like `postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`. Set that as `DATABASE_URL` in Railway and redeploy.

---

## 1. PostgreSQL (required for scaling)

1. Create a Postgres database (e.g. [Supabase](https://supabase.com), [Neon](https://neon.tech), [Railway](https://railway.app)).
2. Run the schema once (creates tables and session store):

   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```

   Or from the app directory: `npm run schema` (uses `DATABASE_URL`; see `path-app/scripts/run-schema.js`).  
   Or in Supabase: SQL Editor → paste contents of `path-app/db/schema.sql` → Run.

3. Set in your host:

   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
   ```

4. Restart the app. Sessions are stored in Postgres when `DATABASE_URL` is set (multi-instance safe).

## 2. Image storage (optional but recommended)

Images can stay as base64 in the DB for small setups. For scale, use object storage so the DB only stores URLs.

### Supabase Storage

1. In Supabase: Storage → New bucket → name `uploads` → Public.
2. Get **Project URL** and **Service Role Key** (Settings → API).
3. Set:

   ```env
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_KEY=your_service_role_key
   SUPABASE_STORAGE_BUCKET=uploads   # optional, default is uploads
   ```

4. When users upload (profile/moment photos), the app uploads to this bucket and saves the public URL. If these are not set, the app falls back to base64 (works for local/dev).

## 3. Invite emails (optional)

When someone is invited to a fam by email, the app stores the invite and **optionally** sends an email so they know to sign up.

1. Sign up at [Resend](https://resend.com) (free tier: 100 emails/day from their domain).
2. Get an API key from the dashboard and set:

   ```env
   RESEND_API_KEY=re_xxxxxxxx
   ```

3. Invite emails will be sent from `onboarding@resend.dev` by default. To use your own domain, verify it in Resend and set:

   ```env
   RESEND_FROM=Fam <invites@yourdomain.com>
   ```

4. The signup link in the email uses your app URL. If the app runs behind a proxy and `req.protocol`/host are wrong, set the full base URL:

   ```env
   INVITE_BASE_URL=https://fam-production.up.railway.app
   ```

If `RESEND_API_KEY` is not set, invites are still saved; the invitee will be added to the fam when they sign up with that email, but they won’t get a notification.

## 4. User feedback to Slack (optional)

Logged-in users can send update suggestions from the app (menu → **Suggest an update**). To have those posts go to a private Slack channel (e.g. `#bots-channel`):

1. In Slack: **Settings** → **Integrations** → **Incoming Webhooks** → **Add to Slack** → choose the channel (e.g. `#bots-channel`) → copy the webhook URL.
2. Set in your app environment:

   ```env
   SLACK_FEEDBACK_WEBHOOK_URL=https://hooks.slack.com/services/T…/B…/…
   ```

3. Each submission is posted to that channel with the user’s name and email plus their message. If this variable is not set, the in-app form will show an error when they try to send.

## 5. Env summary

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | For production | Postgres connection string |
| `SESSION_SECRET` | Recommended | Strong random string for session signing |
| `SUPABASE_URL` | For image uploads | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | For image uploads | Service role key (not anon key) |
| `SUPABASE_STORAGE_BUCKET` | Optional | Bucket name (default: `uploads`) |
| `RESEND_API_KEY` | For invite emails | Resend API key; if unset, invites are saved but no email sent |
| `RESEND_FROM` | Optional | Sender for invite emails (default: `Fam <onboarding@resend.dev>`) |
| `INVITE_BASE_URL` | Optional | App base URL for signup links (default: from request) |
| `SLACK_FEEDBACK_WEBHOOK_URL` | For feedback | Incoming Webhook URL for feedback/suggestions (e.g. #bots-channel) |
| `PORT` | Optional | Server port (default 3000) |
| `NODE_ENV` | Optional | `production` in prod |
| `USE_HTTPS` | Optional | Set to `1` in prod with HTTPS for secure cookies |

## 6. Deploy to Railway or Render (manual)

If you’re not using the Blueprint (`render.yaml` at repo root):

- **Root directory**: `path-app` (if your repo root is the monorepo).
- **Build**: `npm install`
- **Start**: `npm start` (or `node server.js`)
- Add **Postgres** add-on and set `DATABASE_URL`.
- Add the env vars from section 5 (at least `SESSION_SECRET`, `NODE_ENV`, `USE_HTTPS`).
- Run the schema once: from `path-app`, `npm run schema` (with `DATABASE_URL` set), or run `db/schema.sql` against the DB (see step 1).

## 7. Seeding (local JSON only)

The seed script uses the **file-based** DB (`db.js`), not Postgres:

```bash
npm run seed
```

To seed Postgres, use your own script or SQL that inserts into `users`, `moments`, `friends` (and optionally `comments`, `reactions`).
